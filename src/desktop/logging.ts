/**
 * P1.7 — Desktop logging boundary.
 *
 * A minimal, bounded, structured logger for the desktop layer. It is NOT a
 * second security-event system (security events continue to use
 * src/security/security-events.ts). This logger aids development debugging
 * while never writing raw model prompts/responses or raw secrets.
 *
 * - Bounded: a ring buffer keeps the last N entries.
 * - Structured: each entry has a level, scope, message and timestamp.
 * - Safe: every message passes through redaction before retention.
 */
import { redactSecrets } from "../security/secret-redaction.js";

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogEntry {
  level: LogLevel;
  scope: string;
  message: string;
  timestamp: string;
}

export interface DesktopLoggerOptions {
  /** Maximum retained entries in the ring buffer. */
  maxEntries?: number;
  /** Output sink (defaults to console); injectable for tests. */
  sink?: (entry: LogEntry) => void;
  /**
   * Optional additional subscriber (e.g. a bounded file sink). Called after
   * the primary sink for every entry; never allowed to crash the logger.
   */
  onWrite?: (entry: LogEntry) => void;
  now?: () => string;
}

const DEFAULT_MAX_LOG_ENTRIES = 500;

/** Bounded, redacting logger for desktop-layer diagnostics. */
export class DesktopLogger {
  private readonly maxEntries: number;
  private readonly sink: (entry: LogEntry) => void;
  private onWrite?: (entry: LogEntry) => void;
  private readonly now: () => string;
  private readonly buffer: LogEntry[] = [];

  constructor(options: DesktopLoggerOptions = {}) {
    this.maxEntries = options.maxEntries ?? DEFAULT_MAX_LOG_ENTRIES;
    this.onWrite = options.onWrite;
    this.sink = options.sink ?? ((entry: LogEntry) => {
      const line = `[${entry.timestamp}] [${entry.level.toUpperCase()}] [${entry.scope}] ${entry.message}`;
      if (entry.level === "error") {
        // eslint-disable-next-line no-console
        console.error(line);
      } else if (entry.level === "warn") {
        // eslint-disable-next-line no-console
        console.warn(line);
      } else {
        // eslint-disable-next-line no-console
        console.log(line);
      }
    });
    this.now = options.now ?? (() => new Date().toISOString());
  }

  private append(level: LogLevel, scope: string, message: string): void {
    // Never retain raw secrets or unbounded payloads.
    const redacted = redactSecrets(message).redacted.slice(0, 4000);
    const entry: LogEntry = {
      level,
      scope,
      message: redacted,
      timestamp: this.now(),
    };
    this.buffer.push(entry);
    if (this.buffer.length > this.maxEntries) {
      this.buffer.splice(0, this.buffer.length - this.maxEntries);
    }
    try {
      this.sink(entry);
    } catch {
      // Logging must never crash the desktop layer.
    }
    try {
      this.onWrite?.(entry);
    } catch {
      // Secondary sinks (e.g. file sink) must never crash the logger.
    }
  }

  debug(scope: string, message: string): void {
    this.append("debug", scope, message);
  }  info(scope: string, message: string): void {
    this.append("info", scope, message);
  }
  warn(scope: string, message: string): void {
    this.append("warn", scope, message);
  }
  error(scope: string, message: string): void {
    this.append("error", scope, message);
  }

  /** Bounded list of retained entries (newest last). */
  dump(): readonly LogEntry[] {
    return this.buffer.slice();
  }

  /**
   * Attaches an additional, non-fatal sink (e.g. a bounded file sink) after
   * construction. Multiple calls stack subscribers. Never throws.
   */
  attachFileSink(sink: (entry: LogEntry) => void): void {
    const previous = this.onWrite;
    this.onWrite = (entry) => {
      try {
        previous?.(entry);
      } catch {
        // keep logging
      }
      sink(entry);
    };
  }

  clear(): void {
    this.buffer.length = 0;
  }

  get size(): number {
    return this.buffer.length;
  }
}
