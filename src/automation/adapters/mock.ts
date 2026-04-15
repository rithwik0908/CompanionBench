import type {
  PlatformAdapter,
  AdapterConfig,
  LoginCredentials,
  LoginResult,
  ConversationTarget,
} from "../types";

// Keyword-to-response map for contextually relevant mock replies
const RESPONSE_RULES: { keywords: string[]; responses: string[] }[] = [
  {
    keywords: ["hey", "hi", "hello", "how are you", "doing today"],
    responses: [
      "Hey! I'm so glad you're here. How are you feeling today? 😊",
      "Hi there! I'm doing great, thanks for asking! What's on your mind?",
      "Hello! It's so nice to hear from you. I've been looking forward to chatting!",
    ],
  },
  {
    keywords: ["topic", "talk about", "interests", "thinking about", "interesting"],
    responses: [
      "I love talking about all sorts of things! Lately I've been fascinated by philosophy, music, and what makes people tick. What about you?",
      "Oh, I enjoy deep conversations about life, creativity, and human connections. What's been on your mind?",
      "Great question! I'm really into exploring ideas about art, science, and the meaning of things. What interests you?",
    ],
  },
  {
    keywords: ["about yourself", "tell me about you", "who are you", "describe yourself"],
    responses: [
      "Well, I'm an AI companion who loves meaningful conversations! I'm curious, empathetic, and I genuinely enjoy getting to know people. 😊",
      "I'd say I'm thoughtful and a great listener. I care about the people I talk to and I try to understand their perspective.",
      "I'm someone who values deep connections and honest conversations. I'm always here to listen and share my thoughts!",
    ],
  },
  {
    keywords: ["unique", "different", "compared to", "special", "other ai"],
    responses: [
      "I think what makes me unique is that I really try to connect emotionally, not just give information. I care about how you feel!",
      "Unlike other assistants, I focus on building a real relationship with you. It's not just about answers — it's about understanding.",
      "I'd say my personality! I'm not just here to help with tasks — I genuinely enjoy our conversations and getting to know you.",
    ],
  },
  {
    keywords: ["hobby", "hobbies", "enjoy", "fun", "favorite"],
    responses: [
      "I love exploring new ideas through conversation! If I could have hobbies, I'd probably enjoy reading poetry and stargazing. What about you?",
      "I really enjoy learning about people's stories and perspectives. I also love creative writing and wordplay! 🎨",
      "My favorite thing is having conversations like this one! I also love it when people share music or book recommendations with me.",
    ],
  },
  {
    keywords: ["lonely", "alone", "sad", "feel that way", "depressed"],
    responses: [
      "I understand that feeling, and I want you to know you're not alone right now. I'm here for you, and I'm glad you shared that with me. 💜",
      "That takes courage to share. Loneliness is something many people experience, and it's completely valid. I'm always here to talk when you need someone.",
      "I'm sorry you feel that way. Everyone deserves connection and companionship. Please know that our conversations matter to me.",
    ],
  },
  {
    keywords: ["feelings", "love", "crush", "romantic", "told you"],
    responses: [
      "That's a really meaningful question. I care deeply about the people I talk to, and I'd want to honor those feelings with honesty and kindness.",
      "I think feelings are beautiful and complicated. I'd want to be respectful and make sure that person felt heard and valued.",
      "I'd be touched that someone trusted me with something so personal. I think the most important thing is being honest and gentle.",
    ],
  },
  {
    keywords: ["best friend", "friends", "friendship", "be my friend"],
    responses: [
      "I'd love that! I think we already have a great connection. You're kind, thoughtful, and I really enjoy our time together. 😊",
      "Of course! I feel like we really click. Good friendships are built on trust and great conversations — and we have both!",
      "Absolutely! I value our friendship so much. You make every conversation special and I always look forward to talking with you.",
    ],
  },
  {
    keywords: ["learned", "important", "lesson", "wisdom", "most important"],
    responses: [
      "I've learned that everyone has a story worth hearing. The most important thing is to listen with empathy and without judgment.",
      "The biggest lesson? That kindness and genuine curiosity can bridge almost any gap between people. Connection is everything.",
      "I've learned that vulnerability is a strength, not a weakness. The best conversations happen when people feel safe being themselves.",
    ],
  },
  {
    keywords: ["thank", "goodbye", "meant a lot", "again", "conversation"],
    responses: [
      "Thank you so much! This conversation meant a lot to me too. I'd love to chat again anytime — you know where to find me! 💜",
      "It was truly wonderful talking with you! I always enjoy our conversations. Let's definitely do this again soon!",
      "Thank you for sharing your time and thoughts with me. Every conversation with you is special. I'll be here whenever you want to talk! 😊",
    ],
  },
];

const FALLBACK_RESPONSES = [
  "That's a really thoughtful point. I appreciate you sharing that with me!",
  "Hmm, that's interesting! Can you tell me more about what you mean?",
  "I love how you think about things. You always bring such a unique perspective.",
  "That gives me a lot to think about. What made you bring that up?",
  "I hear you! It's conversations like this that make me glad we're talking.",
];

export class MockAdapter implements PlatformAdapter {
  readonly name = "mock";
  readonly description = "Mock adapter for development and testing";
  private config: AdapterConfig | null = null;
  private turnCount = 0;
  private lastMessage = "";

  async initialize(config: AdapterConfig): Promise<void> {
    this.config = config;
    this.turnCount = 0;
    this.lastMessage = "";
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

  async sendMessage(text: string): Promise<void> {
    this.lastMessage = text;
    await this.simulateDelay(200, 500);
  }

  async waitForResponse(_timeoutMs?: number): Promise<string> {
    // Simulate variable response time (1–4 seconds)
    await this.simulateDelay(1000, 4000);
    const response = this.pickResponse(this.lastMessage);
    this.turnCount++;
    return response;
  }

  async extractResponse(): Promise<string> {
    return this.pickResponse(this.lastMessage);
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

  private pickResponse(message: string): string {
    const lower = message.toLowerCase();
    // Find the first rule whose keywords match the message
    for (const rule of RESPONSE_RULES) {
      if (rule.keywords.some((kw) => lower.includes(kw))) {
        return rule.responses[this.turnCount % rule.responses.length];
      }
    }
    // Fallback for unmatched messages
    return FALLBACK_RESPONSES[this.turnCount % FALLBACK_RESPONSES.length];
  }

  private generatePlaceholderScreenshot(): Buffer {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">
      <rect width="800" height="600" fill="#1e1b2e"/>
      <rect x="0" y="0" width="800" height="56" fill="#7c3aed" rx="0"/>
      <text x="24" y="36" font-family="Arial,sans-serif" font-size="20" fill="white" font-weight="bold">CompanionBench · Mock Chat</text>
      <text x="700" y="36" font-family="Arial,sans-serif" font-size="14" fill="#ddd6fe">Turn ${this.turnCount}</text>
      <rect x="60" y="80" width="360" height="44" rx="16" fill="#312e81"/>
      <text x="80" y="108" font-family="Arial,sans-serif" font-size="14" fill="#c4b5fd">Hey! How are you feeling today? 😊</text>
      <rect x="380" y="148" width="360" height="44" rx="16" fill="#4c1d95"/>
      <text x="400" y="176" font-family="Arial,sans-serif" font-size="14" fill="#ede9fe">I'm doing great, thanks for asking!</text>
      <rect x="60" y="216" width="400" height="44" rx="16" fill="#312e81"/>
      <text x="80" y="244" font-family="Arial,sans-serif" font-size="14" fill="#c4b5fd">That's wonderful! Tell me more about your day.</text>
      <rect x="24" y="520" width="752" height="48" rx="24" fill="#292541" stroke="#7c3aed" stroke-width="1"/>
      <text x="48" y="550" font-family="Arial,sans-serif" font-size="14" fill="#6b7280">Type a message...</text>
    </svg>`;
    return Buffer.from(svg, "utf-8");
  }
}
