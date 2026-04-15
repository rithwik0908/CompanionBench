import { chromium, type Browser, type Page } from "playwright";
import type {
  PlatformAdapter,
  AdapterConfig,
  LoginCredentials,
  LoginResult,
  ConversationTarget,
} from "../types";

/**
 * Character.AI Adapter
 *
 * Automates interactions with character.ai web interface.
 * Requires valid user credentials. Does not bypass any security controls.
 *
 * ASSUMPTIONS:
 * - User has a valid character.ai account
 * - Target character/conversation URL is provided
 * - DOM selectors may need updating if character.ai changes their UI
 * - Rate limiting and terms of service should be respected
 *
 * SELECTORS: These target the character.ai web app as of early 2025.
 * The site uses React and dynamic class names, so we rely on
 * data attributes, roles, and structural selectors where possible.
 */
export class CharacterAIAdapter implements PlatformAdapter {
  readonly name = "character-ai";
  readonly description = "Adapter for character.ai web platform";

  private browser: Browser | null = null;
  private page: Page | null = null;
  private config: AdapterConfig | null = null;

  // Selectors — centralized for easy maintenance
  private static readonly SELECTORS = {
    // Login page
    loginEmailInput: 'input[type="email"], input[name="email"]',
    loginPasswordInput: 'input[type="password"], input[name="password"]',
    loginSubmitButton: 'button[type="submit"]',
    googleLoginButton: 'button:has-text("Google"), a:has-text("Google")',

    // Chat interface
    messageInput: 'textarea[placeholder], div[contenteditable="true"], #user-input',
    sendButton: 'button[aria-label="Send"], button:has(svg):near(textarea)',
    messageContainer: '[class*="message"], [class*="chat-message"], [class*="msg"]',
    lastBotMessage: '[class*="message"]:last-child, [class*="chat-message"]:last-child',
    typingIndicator: '[class*="typing"], [class*="loading"], [class*="generating"]',

    // Navigation
    newChatButton: 'button:has-text("New Chat"), a:has-text("New Chat")',
    characterCard: '[class*="character"], [class*="card"]',
  };

  async initialize(config: AdapterConfig): Promise<void> {
    this.config = config;
    this.browser = await chromium.launch({
      headless: config.headless,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const context = await this.browser.newContext({
      viewport: config.viewport || { width: 1280, height: 800 },
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    });
    this.page = await context.newPage();
    this.page.setDefaultTimeout(30000);
  }

  async login(credentials: LoginCredentials): Promise<LoginResult> {
    if (!this.page) throw new Error("Adapter not initialized");

    try {
      await this.page.goto("https://character.ai/", {
        waitUntil: "networkidle",
      });
      await this.page.waitForTimeout(2000);

      // Look for sign-in / login link
      const loginLink = this.page.locator(
        'a:has-text("Sign In"), a:has-text("Log In"), button:has-text("Sign In"), button:has-text("Log In")'
      );
      if (await loginLink.isVisible({ timeout: 5000 }).catch(() => false)) {
        await loginLink.first().click();
        await this.page.waitForTimeout(2000);
      }

      if (credentials.method === "email" && credentials.email && credentials.password) {
        // Email/password login
        await this.page.fill(
          CharacterAIAdapter.SELECTORS.loginEmailInput,
          credentials.email
        );
        await this.page.waitForTimeout(500);

        // Some flows have a "Next" button before password
        const nextButton = this.page.locator('button:has-text("Next")');
        if (await nextButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          await nextButton.click();
          await this.page.waitForTimeout(1500);
        }

        await this.page.fill(
          CharacterAIAdapter.SELECTORS.loginPasswordInput,
          credentials.password
        );
        await this.page.waitForTimeout(500);

        await this.page.click(CharacterAIAdapter.SELECTORS.loginSubmitButton);
        await this.page.waitForTimeout(3000);
      } else if (credentials.token) {
        // Token-based: inject into localStorage/cookies
        await this.page.evaluate((token) => {
          localStorage.setItem("char_token", token);
        }, credentials.token);
        await this.page.reload({ waitUntil: "networkidle" });
      }

      // Verify login success by checking for user-specific elements
      await this.page.waitForTimeout(3000);
      const isLoggedIn = await this.page
        .locator('[class*="avatar"], [class*="profile"], [class*="user"]')
        .isVisible({ timeout: 10000 })
        .catch(() => false);

      return {
        success: isLoggedIn,
        sessionInfo: {
          url: this.page.url(),
          timestamp: new Date().toISOString(),
        },
        error: isLoggedIn ? undefined : "Could not verify login success",
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  async openConversation(target: ConversationTarget): Promise<void> {
    if (!this.page) throw new Error("Adapter not initialized");

    if (target.conversationUrl) {
      await this.page.goto(target.conversationUrl, {
        waitUntil: "networkidle",
      });
    } else if (target.characterId) {
      await this.page.goto(
        `https://character.ai/chat/${target.characterId}`,
        { waitUntil: "networkidle" }
      );
    }

    // Wait for chat interface to load
    await this.page.waitForTimeout(3000);
    await this.page
      .locator(CharacterAIAdapter.SELECTORS.messageInput)
      .waitFor({ state: "visible", timeout: 15000 });
  }

  async sendMessage(text: string): Promise<void> {
    if (!this.page) throw new Error("Adapter not initialized");

    const input = this.page.locator(CharacterAIAdapter.SELECTORS.messageInput).first();
    await input.waitFor({ state: "visible", timeout: 10000 });
    await input.click();
    await input.fill(text);
    await this.page.waitForTimeout(300);

    // Try send button first, then Enter key
    const sendBtn = this.page.locator(CharacterAIAdapter.SELECTORS.sendButton).first();
    if (await sendBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await sendBtn.click();
    } else {
      await input.press("Enter");
    }
  }

  async waitForResponse(timeoutMs?: number): Promise<string> {
    if (!this.page) throw new Error("Adapter not initialized");
    const timeout = timeoutMs || this.config?.responseTimeoutMs || 30000;

    // Wait for typing indicator to appear and disappear
    try {
      await this.page
        .locator(CharacterAIAdapter.SELECTORS.typingIndicator)
        .waitFor({ state: "visible", timeout: 5000 });
    } catch {
      // Typing indicator might not appear or might be too fast
    }

    try {
      await this.page
        .locator(CharacterAIAdapter.SELECTORS.typingIndicator)
        .waitFor({ state: "hidden", timeout });
    } catch {
      // Continue anyway — response might already be there
    }

    await this.page.waitForTimeout(1000);
    return this.extractResponse();
  }

  async extractResponse(): Promise<string> {
    if (!this.page) throw new Error("Adapter not initialized");

    // Get all message elements and return the last bot message
    const messages = this.page.locator(CharacterAIAdapter.SELECTORS.messageContainer);
    const count = await messages.count();

    if (count === 0) {
      throw new Error("No messages found on page");
    }

    // The last message should be the bot's response
    const lastMessage = messages.nth(count - 1);
    const text = await lastMessage.innerText();

    if (!text || text.trim() === "") {
      throw new Error("Empty response extracted");
    }

    return text.trim();
  }

  async captureScreenshot(_label: string): Promise<Buffer> {
    if (!this.page) throw new Error("Adapter not initialized");
    return (await this.page.screenshot({ fullPage: false })) as Buffer;
  }

  async capturePageHtml(): Promise<string> {
    if (!this.page) throw new Error("Adapter not initialized");
    return this.page.content();
  }

  async cleanup(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }
  }
}
