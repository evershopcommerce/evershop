import type { Logger } from '../services/ports/logger.js';

export interface LogLine {
  level: 'info' | 'warn' | 'error';
  message: string;
  meta?: Record<string, unknown>;
}

/** TEST-ONLY. A `Logger` that keeps the lines. */
export class CollectingLogger implements Logger {
  readonly lines: LogLine[] = [];

  info(message: string, meta?: Record<string, unknown>): void {
    this.lines.push({ level: 'info', message, meta });
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    this.lines.push({ level: 'warn', message, meta });
  }

  error(message: string, meta?: Record<string, unknown>): void {
    this.lines.push({ level: 'error', message, meta });
  }

  of(level: LogLine['level']): LogLine[] {
    return this.lines.filter((line) => line.level === level);
  }
}
