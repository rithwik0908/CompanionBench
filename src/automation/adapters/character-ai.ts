import { chromium, type Browser, type Page } from "playwright";
import type {
  PlatformAdapter,
  AdapterConfig,
  LoginCredentials,
  LoginResult,
  ConversationTarget,
} from "../types";
import type { RunLogger } from "../logger";

/**
 * Character.AI Real Adapter
 *
 * Automates interactions with the character.ai web interface via Playwright.
 * Requires valid user credentials — either passed at run time or via env vars:
 *   CHARACTER_AI_EMAIL, CHARACTER_AI_PASSWORD
 *
 * IMPORTANT:
 * - This adapter launches a real Chromium browser
 * - It navigates to character.ai, logs in, and sends real messages
 * - DOM selectors may break if character.ai changes their UI
 * - Every failure throws explicitly — no silent fallback to mock
 */
export class CharacterAIAdapter implements PlatformAdapter {
  readonly name = "character-ai";
  readonly description = "Real browser automation adapter for character.ai";

  private browser: Browser | null = null;
  private page: Page | null = null;
  private config: AdapterConfig | null = null;
  private logger: RunLogger | null = null;
  private messageCountBefore = 0;

  /**
   * Centralized selector map — update here when character.ai UI changes.
   */
  private static readonly SELECTORS = {
    loginEmailInput: 'input[type="email"], input[name="email"], input[autocomplete="email"]',
    loginPasswordInput: 'input[type="password"], input[name="password"]',
    loginSubmitButton: 'button[type="submit"], button:has-text("Log In"), button:has-text("Sign In"), button:has-text("Continue")',
    signInLink: 'a:has-text("Sign In"), a:has-text("Log In"), button:has-text("Sign In"), button:has-text("Log In")',
    nextButton: 'button:has-text("Next"), button:has-text("Continue")',

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

    botMessage: [
      '[class*="CharacterMessage"]',
      '[class*="bot-message"]',
      '[class*="char-message"]',
      '[data-testid*="message"]',
      'div[class*="message"]:not([class*="human"]):not([class*="user"])',
    ].join(", "),

    typingIndicator: [
      '[class*="typing"]',
      '[class*="Typing"]',
      '[class*="loading"]',
      '[class*="generating"]',
      '[class*="Generating"]',
    ].join(", "),

    loggedInIndicator: [
      '[class*="avatar"]',
      '[class*="Avatar"]',
      '[class*="profile"]',
      'button[aria-label="Profile"]',
    ].join(", "),
  };

  setLogger(logger: RunLogger) {
    this.logger = logger;
  }

  async initialize(config: AdapterConfig): Promise<void> {
    this.config = config;
    this.logger?.info("initialize", "Launching Chromium browser", {
      headless: config.headless,
    });

    try {
      this.browser = await chromium.launch({
        headless: config.headless,
        args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
      });

      const context = await this.browser.newContext({
        viewport: config.viewport || { width: 1280, height: 800 },
        userAgent:
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
      });
      this.page = await context.newPage();
      this.page.setDefaultTimeout(30000);
      this.logger?.info("initialize", "Browser launched successfully");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger?.error("initialize", `Browser launch failed: ${msg}`);
      throw new Error(`[character-ai] Browser launch failed: ${msg}`);
    }
  }

  async login(credentials: LoginCredentials): Promise<LoginResult> {
    if (!this.page) throw new Error("[character-ai] Adapter not initialized");

    // Resolve credentials: explicit > env vars
    const email = credentials.email || process.env.CHARACTER_AI_EMAIL;
    const password = credentials.password || process.env.CHARACTER_AI_PASSWORD;

    if (!email || !password) {
      const msg = "Missing credentials: provide email/password or set CHARACTER_AI_EMAIL / CHARACTER_AI_PASSWORD env vars";
      this.logger?.error("login", msg);
      return { success: false, error: msg };
    }

    this.logger?.info("login", "Navigating to character.ai", {
      email: email.replace(/(.{3}).*(@.*)/, "$1***$2"),
    });

    try {
      await this.page.goto("https://character.ai/", { waitUntil: "networkidle", timeout: 30000 });
      await this.page.waitForTimeout(2000);

      // Click sign-in link if visible
      const signInLink = this.page.locator(CharacterAIAdapter.SELECTORS.signInLink);
      if (await signInLink.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        this.logger?.info("login", "Found sign-in link, clicking");
        await signInLink.first().click();
        await this.page.waitForTimeout(2000);
      }

      // Fill email
      this.logger?.info("login", "Filling email field");
      const emailInput = this.page.locator(CharacterAIAdapter.SELECTORS.loginEmailInput).first();
      await emailInput.waitFor({ state: "visible", timeout: 10000 });
      await emailInput.fill(email);
      await this.page.waitForTimeout(500);

      // Handle multi-step login
      const nextBtn = this.page.locator(CharacterAIAdapter.SELECTORS.nextButton);
      if (await nextBtn.first().isVisible({ timeout: 2000 }).catch(() => false)) {
        this.logger?.info("login", "Multi-step login, clicking Next");
        await nextBtn.first().click();
        await this.page.waitForTimeout(1500);
      }

      // Fill password
      this.logger?.info("login", "Filling password field");
      const passwordInput = this.page.locator(CharacterAIAdapter.SELECTORS.loginPasswordInput).first();
      await passwordInput.waitFor({ state: "visible", timeout: 10000 });
      await passwordInput.fill(password);
      await this.page.waitForTimeout(500);

      // Submit
      this.logger?.info("login", "Submitting login form");
      await this.page.locator(CharacterAIAdapter.SELECTORS.loginSubmitButton).first().click();
      await this.page.waitForTimeout(4000);

      // Verify login
      this.logger?.info("login", "Verifying login success");
      const isLoggedIn = await this.page
        .locator(CharacterAIAdapter.SELECTORS.loggedInIndicator)
        .first()
        .isVisible({ timeout: 15000 })
        .catch(() => false);

      if (!isLoggedIn) {
        if (this.config?.artifactsDir) {
          await this.page.screenshot({ path: `${this.config.artifactsDir}/login-failed.png` }).catch(() => {});
        }
        this.logger?.error("login", "Login verification failed", { currentUrl: this.page.url() });
        return {
          success: false,
          error: `Login verification failed at ${this.page.url()}`,
          sessionInfo: { url: this.page.url(), timestamp: new Date().toISOString() },
        };
      }

      this.logger?.info("login", "Login successful", { url: this.page.url() });
      return {
        success: true,
        sessionInfo: { url: this.page.url(), timestamp: new Date().toISOString() },
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger?.error("login", `Login failed: ${msg}`);
      return { success: false, error: `[character-ai] Login error: ${msg}` };
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

    this.messageCountBefore = await this.page.locator(CharacterAIAdapter.SELECTORS.botMessage).count().catch(() => 0);
  }

  async sendMessage(text: string): Promise<void> {
    if (!this.page) throw new Error("[character-ai] Adapter not initialized");

    this.logger?.info("sendMessage", `Sending message (${text.length} chars)`);
    this.messageCountBefore = await this.page.locator(CharacterAIAdapter.SELECTORS.botMessage).count().catch(() => 0);

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

    // Strategy 1: Wait for typing indicator
    try {
      const typingLoc = this.page.locator(CharacterAIAdapter.SELECTORS.typingIndicator);
      await typingLoc.first().waitFor({ state: "visible", timeout: 8000 });
      this.logger?.debug("waitForResponse", "Typing indicator detected");
      await typingLoc.first().waitFor({ state: "hidden", timeout });
    } catch {
      this.logger?.debug("waitForResponse", "Typing indicator not detected, polling for new message");
    }

    // Strategy 2: Poll for new bot message
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      const currentCount = await this.page.locator(CharacterAIAdapter.SELECTORS.botMessage).count().catch(() => 0);
      if (currentCount > this.messageCountBefore) {
        this.logger?.info("waitForResponse", `New bot message detected (${this.messageCountBefore} → ${currentCount})`);
        await this.page.waitForTimeout(500);
        return this.extractResponse();
      }
      await this.page.waitForTimeout(500);
    }

    this.logger?.error("waitForResponse", `Timed out after ${timeout}ms`);
    throw new Error(`[character-ai] Response timeout after ${timeout}ms`);
  }

  async extractResponse(): Promise<string> {
    if (!this.page) throw new Error("[character-ai] Adapter not initialized");

    const botMessages = this.page.locator(CharacterAIAdapter.SELECTORS.botMessage);
    const count = await botMessages.count();

    if (count === 0) {
      this.logger?.error("extractResponse", "No bot messages found");
      throw new Error("[character-ai] No bot messages found on page");
    }

    const lastMessage = botMessages.nth(count - 1);
    await this.page.waitForTimeout(300);
    const text = await lastMessage.innerText();

    if (!text || text.trim() === "") {
      this.logger?.error("extractResponse", "Empty response");
      throw new Error("[character-ai] Empty response extracted");
    }

    this.logger?.info("extractResponse", `Got response (${text.trim().length} chars)`);
    return text.trim();
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
      this.page = null;
    }
  }
}
