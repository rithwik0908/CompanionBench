import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import type {
  PlatformAdapter,
  AdapterConfig,
  LoginCredentials,
  LoginResult,
  ConversationTarget,
} from "../types";
import type { RunLogger } from "../logger";
import * as fs from "fs/promises";
import * as path from "path";

/** Default path where the authenticated session is persisted. */
export const AUTH_STATE_PATH = path.join(process.cwd(), ".auth", "character-ai.json");

/**
 * Check whether a valid storage-state file exists.
 */
export async function hasStorageState(statePath = AUTH_STATE_PATH): Promise<boolean> {
  try {
    const stat = await fs.stat(statePath);
    return stat.isFile() && stat.size > 2; // not an empty JSON
  } catch {
    return false;
  }
}

/**
 * Character.AI Real Adapter
 *
 * Automates interactions with the character.ai web interface via Playwright.
 * Auth uses a persisted Playwright storage-state file (.auth/character-ai.json)
 * created by running `npm run auth:character-ai`.
 *
 * Character.AI no longer supports standard email+password login — it uses
 * email-link or OAuth (Google / Apple). So we:
 *   1. Launch a visible browser once for the user to log in manually.
 *   2. Save the authenticated storage state to disk.
 *   3. Subsequent runs reuse that session automatically.
 *
 * IMPORTANT:
 * - This adapter launches a real Chromium browser
 * - It navigates to character.ai and sends real messages
 * - DOM selectors may break if character.ai changes their UI
 * - Every failure throws explicitly — no silent fallback to mock
 */
export class CharacterAIAdapter implements PlatformAdapter {
  readonly name = "character-ai";
  readonly description = "Real browser automation adapter for character.ai (session-based auth)";

  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private config: AdapterConfig | null = null;
  private logger: RunLogger | null = null;
  /** Snapshot of all chat text blocks before sending a message */
  private textBlocksBefore: string[] = [];

  /**
   * Centralized selector map — update here when character.ai UI changes.
   */
  private static readonly SELECTORS = {
    messageInput: [
      'textarea#user-input',
      'textarea[placeholder*="Message"]',
      'textarea[placeholder*="message"]',
      'textarea[placeholder*="Type"]',
      'div[contenteditable="true"]',
      'textarea',
    ].join(", "),

    sendButton: [
      'button[aria-label="Send"]',
      'button[aria-label="send"]',
      'button[type="submit"]:near(textarea)',
    ].join(", "),

    typingIndicator: [
      '[class*="typing"]',
      '[class*="Typing"]',
      '[class*="loading"]',
      '[class*="generating"]',
      '[class*="Generating"]',
    ].join(", "),
  };

  setLogger(logger: RunLogger) {
    this.logger = logger;
  }

  async initialize(config: AdapterConfig): Promise<void> {
    this.config = config;

    const statePath = AUTH_STATE_PATH;
    const hasState = await hasStorageState(statePath);

    this.logger?.info("initialize", "Launching Chromium browser", {
      headless: config.headless,
      hasStorageState: hasState,
    });

    try {
      this.browser = await chromium.launch({
        headless: config.headless,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          // Force Chromium to use pre-resolved IPs — WSL Chromium can't use the system DNS
          "--host-resolver-rules=MAP character.ai 104.18.223.226,MAP *.character.ai 104.18.223.226",
        ],
      });

      const contextOptions: Parameters<Browser["newContext"]>[0] = {
        viewport: config.viewport || { width: 1280, height: 800 },
        userAgent:
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
      };

      // Restore authenticated session if storage state exists
      if (hasState) {
        this.logger?.info("initialize", "Loading saved storage state", { path: statePath });
        contextOptions.storageState = statePath;
      }

      this.context = await this.browser.newContext(contextOptions);
      this.page = await this.context.newPage();
      this.page.setDefaultTimeout(30000);
      this.logger?.info("initialize", "Browser launched successfully");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger?.error("initialize", `Browser launch failed: ${msg}`);
      throw new Error(`[character-ai] Browser launch failed: ${msg}`);
    }
  }

  async login(_credentials: LoginCredentials): Promise<LoginResult> {
    if (!this.page) throw new Error("[character-ai] Adapter not initialized");

    this.logger?.info("login", "Navigating to character.ai to verify session");

    try {
      await this.page.goto("https://character.ai/", {
        waitUntil: "networkidle",
        timeout: 30000,
      });
      await this.page.waitForTimeout(3000);

      const currentUrl = this.page.url();
      this.logger?.info("login", "Page loaded", { url: currentUrl });

      // Session is invalid if redirected to login/auth pages
      const isAuthPage =
        currentUrl.includes("/login") ||
        currentUrl.includes("/sign-in") ||
        currentUrl.includes("/auth") ||
        currentUrl.includes("accounts.google.com") ||
        currentUrl.includes("appleid.apple.com");

      if (isAuthPage) {
        if (this.config?.artifactsDir) {
          await this.page
            .screenshot({ path: `${this.config.artifactsDir}/session-expired.png` })
            .catch(() => {});
        }
        this.logger?.error("login", "Session expired — redirected to auth page", { currentUrl });
        return {
          success: false,
          error:
            'Saved session is expired or invalid. Run "npm run auth:character-ai" to re-authenticate, then try again.',
          sessionInfo: { url: currentUrl, timestamp: new Date().toISOString() },
        };
      }

      this.logger?.info("login", "Session appears valid", { url: currentUrl });
      return {
        success: true,
        sessionInfo: { url: currentUrl, timestamp: new Date().toISOString() },
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger?.error("login", `Session verification failed: ${msg}`);
      return { success: false, error: `[character-ai] Session verification error: ${msg}` };
    }
  }

  async openConversation(target: ConversationTarget): Promise<void> {
    if (!this.page) throw new Error("[character-ai] Adapter not initialized");

    const url = target.conversationUrl
      || (target.characterId ? `https://character.ai/chat/${target.characterId}` : null);

    if (!url) {
      const msg = "No conversation URL or character ID provided";
      this.logger?.error("openConversation", msg);
      throw new Error(`[character-ai] ${msg}`);
    }

    this.logger?.info("openConversation", "Navigating to conversation", { url });
    await this.page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
    await this.page.waitForTimeout(3000);

    this.logger?.info("openConversation", "Waiting for chat input");
    try {
      await this.page.locator(CharacterAIAdapter.SELECTORS.messageInput).first()
        .waitFor({ state: "visible", timeout: 15000 });
      this.logger?.info("openConversation", "Chat interface ready");
    } catch {
      if (this.config?.artifactsDir) {
        await this.page.screenshot({ path: `${this.config.artifactsDir}/conversation-load-failed.png` }).catch(() => {});
      }
      this.logger?.error("openConversation", "Chat input not found");
      throw new Error(`[character-ai] Chat input not found at ${this.page.url()}`);
    }

    // Snapshot all text blocks in the chat area
    this.textBlocksBefore = await this.getTextBlocks();
    this.logger?.debug("openConversation", `Snapshotted ${this.textBlocksBefore.length} text blocks`);
  }

  /**
   * Extract all visible text blocks from the page's main chat area.
   * Uses page.evaluate to be resilient to DOM class-name changes.
   */
  private async getTextBlocks(): Promise<string[]> {
    if (!this.page) return [];
    return this.page.evaluate(() => {
      // Try to find the chat scroll container (the area with messages)
      const chatArea =
        document.querySelector('main') ||
        document.querySelector('[class*="chat"]') ||
        document.querySelector('[class*="scroll"]') ||
        document.body;

      // Get all paragraph-level elements that contain meaningful text
      const seen = new Set<string>();
      const blocks: string[] = [];
      const elements = chatArea.querySelectorAll('p, [class*="markdown"], [class*="msg"], [class*="text"], [class*="content"]');
      elements.forEach((el) => {
        const text = (el as HTMLElement).innerText?.trim();
        if (text && text.length > 5 && !seen.has(text)) {
          seen.add(text);
          blocks.push(text);
        }
      });

      // Fallback: if no <p> elements found, split the whole area by newlines
      if (blocks.length === 0) {
        const allText = (chatArea as HTMLElement).innerText || "";
        allText.split("\n").forEach((line) => {
          const trimmed = line.trim();
          if (trimmed.length > 10) blocks.push(trimmed);
        });
      }

      return blocks;
    });
  }

  async sendMessage(text: string): Promise<void> {
    if (!this.page) throw new Error("[character-ai] Adapter not initialized");

    this.logger?.info("sendMessage", `Sending message (${text.length} chars)`);

    // Snapshot text blocks BEFORE sending so we can diff later
    this.textBlocksBefore = await this.getTextBlocks();
    this.logger?.debug("sendMessage", `Snapshotted ${this.textBlocksBefore.length} text blocks before send`);

    const input = this.page.locator(CharacterAIAdapter.SELECTORS.messageInput).first();
    try {
      await input.waitFor({ state: "visible", timeout: 10000 });
    } catch {
      this.logger?.error("sendMessage", "Message input not visible");
      throw new Error("[character-ai] Message input not visible");
    }

    await input.click();
    await input.fill(text);
    await this.page.waitForTimeout(300);

    const sendBtn = this.page.locator(CharacterAIAdapter.SELECTORS.sendButton).first();
    if (await sendBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await sendBtn.click();
    } else {
      await input.press("Enter");
    }

    this.logger?.info("sendMessage", "Message sent");
  }

  async waitForResponse(timeoutMs?: number): Promise<string> {
    if (!this.page) throw new Error("[character-ai] Adapter not initialized");
    const timeout = timeoutMs || this.config?.responseTimeoutMs || 30000;

    this.logger?.info("waitForResponse", `Waiting (timeout: ${timeout}ms)`);

    // Strategy 1: Wait for typing indicator to appear then disappear
    try {
      const typingLoc = this.page.locator(CharacterAIAdapter.SELECTORS.typingIndicator);
      await typingLoc.first().waitFor({ state: "visible", timeout: 8000 });
      this.logger?.debug("waitForResponse", "Typing indicator detected");
      await typingLoc.first().waitFor({ state: "hidden", timeout });
      this.logger?.debug("waitForResponse", "Typing indicator gone");
    } catch {
      this.logger?.debug("waitForResponse", "No typing indicator, will poll for new text");
    }

    // Strategy 2: Poll until we detect new text content on the page
    const beforeSet = new Set(this.textBlocksBefore);
    const startTime = Date.now();
    let lastNewBlockCount = 0;
    let stableCount = 0;

    while (Date.now() - startTime < timeout) {
      await this.page.waitForTimeout(1000);
      const currentBlocks = await this.getTextBlocks();

      // Find text blocks that didn't exist before the message was sent
      const newBlocks = currentBlocks.filter((b) => !beforeSet.has(b));

      if (newBlocks.length > 0) {
        // Wait for the response to stabilize (same block count for 2 consecutive polls)
        if (newBlocks.length === lastNewBlockCount) {
          stableCount++;
        } else {
          stableCount = 0;
        }
        lastNewBlockCount = newBlocks.length;

        if (stableCount >= 2) {
          // Filter out blocks that look like our sent user message (exact match)
          const sentMessages = new Set(this.textBlocksBefore);
          const responseBlocks = newBlocks.filter((b) => !sentMessages.has(b));

          // Join ALL new blocks to capture the full multi-paragraph response
          const fullResponse = responseBlocks.join("\n\n").trim();
          this.logger?.info("waitForResponse", `Response stabilized (${responseBlocks.length} blocks, ${fullResponse.length} chars)`);
          return fullResponse || newBlocks.join("\n\n").trim();
        }
      }
    }

    // If we got some new blocks but never stabilized, return what we have
    const currentBlocks = await this.getTextBlocks();
    const finalNew = currentBlocks.filter((b) => !beforeSet.has(b));
    if (finalNew.length > 0) {
      const fullResponse = finalNew.join("\n\n").trim();
      this.logger?.warn("waitForResponse", `Returning unstabilized response (${finalNew.length} blocks, ${fullResponse.length} chars)`);
      return fullResponse;
    }

    this.logger?.error("waitForResponse", `Timed out after ${timeout}ms`);
    throw new Error(`[character-ai] Response timeout after ${timeout}ms`);
  }

  async extractResponse(): Promise<string> {
    if (!this.page) throw new Error("[character-ai] Adapter not initialized");

    // Fallback: get all current text blocks and return the last substantial one
    const blocks = await this.getTextBlocks();
    if (blocks.length === 0) {
      this.logger?.error("extractResponse", "No text blocks found");
      throw new Error("[character-ai] No text content found on page");
    }

    const last = blocks[blocks.length - 1];
    this.logger?.info("extractResponse", `Got response (${last.length} chars)`);
    return last;
  }

  async captureScreenshot(label: string): Promise<Buffer> {
    if (!this.page) throw new Error("[character-ai] Adapter not initialized");
    this.logger?.debug("captureScreenshot", `Capturing: ${label}`);
    const buffer = (await this.page.screenshot({ fullPage: false })) as Buffer;
    this.logger?.info("captureScreenshot", `Saved: ${label} (${buffer.length} bytes)`);
    return buffer;
  }

  async capturePageHtml(): Promise<string> {
    if (!this.page) throw new Error("[character-ai] Adapter not initialized");
    return this.page.content();
  }

  async cleanup(): Promise<void> {
    this.logger?.info("cleanup", "Closing browser");
    if (this.browser) {
      await this.browser.close().catch(() => {});
      this.browser = null;
      this.context = null;
      this.page = null;
    }
  }
}
