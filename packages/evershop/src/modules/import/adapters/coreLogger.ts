import { error as logError, info, warning } from '../../../lib/log/logger.js';
import type { Logger } from '../services/ports/logger.js';

/**
 * The `Logger` port over core's logger. Core's logger takes one message, so the
 * meta is written after it as JSON; an error line is an `Error`, which is what
 * core's logger prints with a stack.
 */
export const coreLogger: Logger = {
  info: (message, meta) =>
    info(meta ? `${message} ${JSON.stringify(meta)}` : message),
  warn: (message, meta) =>
    warning(meta ? `${message} ${JSON.stringify(meta)}` : message),
  error: (message, meta) =>
    logError(new Error(`${message} ${JSON.stringify(meta ?? {})}`))
};
