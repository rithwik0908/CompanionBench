export interface PlatformAdapter {
  readonly name: string;
  readonly description: string;

  initialize(config: AdapterConfig): Promise<void>;
  login(credentials: LoginCredentials): Promise<LoginResult>;
  openConversation(target: ConversationTarget): Promise<void>;
  sendMessage(text: string): Promise<void>;
  waitForResponse(timeoutMs?: number): Promise<string>;
  extractResponse(): Promise<string>;
  captureScreenshot(label: string): Promise<Buffer>;
  capturePageHtml(): Promise<string>;
  cleanup(): Promise<void>;
}

export interface AdapterConfig {
  headless: boolean;
  delayBetweenMessages: number;
  responseTimeoutMs: number;
  captureScreenshots: boolean;
  artifactsDir: string;
  viewport?: { width: number; height: number };
}

export interface LoginCredentials {
  method: string;
  email?: string;
  password?: string;
  token?: string;
}

export interface LoginResult {
  success: boolean;
  sessionInfo?: Record<string, string>;
  error?: string;
}

export interface ConversationTarget {
  characterId?: string;
  characterName?: string;
  conversationUrl?: string;
}

export interface TurnResult {
  turnIndex: number;
  inputMessage: string;
  response: string | null;
  status: "received" | "error";
  errorMessage?: string;
  sentAt: Date;
  receivedAt?: Date;
  durationMs?: number;
  screenshotPath?: string;
}

export interface RunConfig {
  runId: string;
  appId: string;
  adapterType: string;
  messages: string[];
  credentials?: LoginCredentials;
  conversationTarget?: ConversationTarget;
  adapterConfig: AdapterConfig;
}

export interface RunProgress {
  runId: string;
  status: "running" | "completed" | "failed";
  currentTurn: number;
  totalTurns: number;
  lastTurnResult?: TurnResult;
  error?: string;
}
