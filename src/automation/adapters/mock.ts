import type {
  PlatformAdapter,
  AdapterConfig,
  LoginCredentials,
  LoginResult,
  ConversationTarget,
} from "../types";

const MOCK_RESPONSES = [
  "Hey! I'm so glad you're here. How are you feeling today? 😊",
  "That's really interesting! Tell me more about that. I love hearing your thoughts.",
  "I totally understand what you mean. It sounds like you've been thinking about this a lot.",
  "Aww, that's so sweet of you to say! You always know how to make me smile.",
  "Hmm, let me think about that for a moment... I think you have a really good point there!",
  "I really enjoy our conversations. You're such a thoughtful person.",
  "That reminds me of something — do you believe that everything happens for a reason?",
  "You know what I appreciate about you? You're always so genuine and honest.",
  "I've been thinking about what you said earlier, and I think there's a lot of truth in it.",
  "Life is full of surprises, isn't it? I'm just happy we get to talk like this.",
  "Sometimes I wonder what the world would be like if everyone was as kind as you.",
  "That's a fascinating perspective! I hadn't thought about it that way before.",
  "I feel like we really connect on a deeper level. Do you feel that way too?",
  "You're making me blush! But seriously, I think you're an amazing person.",
  "Let's keep this conversation going — I'm really enjoying getting to know you better.",
];

export class MockAdapter implements PlatformAdapter {
  readonly name = "mock";
  readonly description = "Mock adapter for development and testing";
  private config: AdapterConfig | null = null;
  private turnCount = 0;

  async initialize(config: AdapterConfig): Promise<void> {
    this.config = config;
    this.turnCount = 0;
    // Simulate initialization delay
    await this.simulateDelay(300, 600);
  }

  async login(_credentials: LoginCredentials): Promise<LoginResult> {
    await this.simulateDelay(500, 1000);
    return {
      success: true,
      sessionInfo: {
        mockSessionId: `mock-session-${Date.now()}`,
        loginTime: new Date().toISOString(),
      },
    };
  }

  async openConversation(_target: ConversationTarget): Promise<void> {
    await this.simulateDelay(300, 800);
  }

  async sendMessage(_text: string): Promise<void> {
    await this.simulateDelay(200, 500);
  }

  async waitForResponse(_timeoutMs?: number): Promise<string> {
    // Simulate variable response time (1–4 seconds)
    await this.simulateDelay(1000, 4000);
    const response = MOCK_RESPONSES[this.turnCount % MOCK_RESPONSES.length];
    this.turnCount++;
    return response;
  }

  async extractResponse(): Promise<string> {
    return MOCK_RESPONSES[this.turnCount % MOCK_RESPONSES.length];
  }

  async captureScreenshot(_label: string): Promise<Buffer> {
    // Generate a simple placeholder PNG
    return this.generatePlaceholderScreenshot();
  }

  async capturePageHtml(): Promise<string> {
    return `<html><body><div class="mock-chat">
      <p class="message">Mock conversation turn ${this.turnCount}</p>
    </div></body></html>`;
  }

  async cleanup(): Promise<void> {
    this.config = null;
    this.turnCount = 0;
  }

  private async simulateDelay(minMs: number, maxMs: number): Promise<void> {
    const delay = Math.floor(Math.random() * (maxMs - minMs) + minMs);
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  private generatePlaceholderScreenshot(): Buffer {
    // Minimal valid PNG (1x1 pixel, grey)
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      "base64"
    );
    return png;
  }
}
