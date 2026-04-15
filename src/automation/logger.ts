/**
 * Structured logger for automation runs.
 * Logs are stored in-memory per run and persisted to DB as run progresses.
 */

export interface LogEntry {
  timestamp: string;
  level: "info" | "warn" | "error" | "debug";
  stage: string;
  message: string;
  meta?: Record<string, unknown>;
}

export class RunLogger {
  readonly runId: string;
  readonly adapterType: string;
  private entries: LogEntry[] = [];

  constructor(runId: string, adapterType: string) {
    this.runId = runId;
    this.adapterType = adapterType;
  }

  info(stage: string, message: string, meta?: Record<string, unknown>) {
    this.log("info", stage, message, meta);
  }

  warn(stage: string, message: string, meta?: Record<string, unknown>) {
    this.log("warn", stage, message, meta);
  }

  error(stage: string, message: string, meta?: Record<string, unknown>) {
    this.log("error", stage, message, meta);
  }

  debug(stage: string, message: string, meta?: Record<string, unknown>) {
    this.log("debug", stage, message, meta);
  }

  getEntries(): LogEntry[] {
    return [...this.entries];
  }

  /** Serialized log suitable for DB storage */
  serialize(): string {
    return JSON.stringify(this.entries);
  }

  private log(level: LogEntry["level"], stage: string, message: string, meta?: Record<string, unknown>) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      stage,
      message,
      meta,
    };
    this.entries.push(entry);

    // Also emit to server console for real-time debugging
    const prefix = `[Run:${this.runId.slice(0, 8)}] [${this.adapterType}] [${stage}]`;
    switch (level) {
      case "error":
        console.error(`${prefix} ${message}`, meta || "");
        break;
      case "warn":
        console.warn(`${prefix} ${message}`, meta || "");
        break;
      default:
        console.log(`${prefix} ${message}`, meta || "");
    }
  }
}

/**
 * Global map of active run loggers — allows the stream endpoint to read logs.
 */
const activeLoggers = new Map<string, RunLogger>();

export function registerLogger(logger: RunLogger) {
  activeLoggers.set(logger.runId, logger);
}

export function getLogger(runId: string): RunLogger | undefined {
  return activeLoggers.get(runId);
}

export function removeLogger(runId: string) {
  activeLoggers.delete(runId);
}
