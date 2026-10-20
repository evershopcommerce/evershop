import { ImageError } from './images/types.js';

/** The waits before the three retries of a transient failure (D-20). */
export const RETRY_WAITS_MS: readonly number[] = [1000, 3000, 9000];

// PostgreSQL: serialization failure, deadlock, lock timeout, statement timeout,
// too many connections (D-20); and the restart of the server (57P01 to 57P03),
// which is how an outage of a few minutes shows to a connection that was open.
const TRANSIENT_SQLSTATES: ReadonlySet<string> = new Set([
  '40001',
  '40P01',
  '55P03',
  '57014',
  '53300',
  '57P01',
  '57P02',
  '57P03'
]);

const TRANSIENT_SOCKET_CODES: ReadonlySet<string> = new Set([
  'ECONNREFUSED',
  'ECONNRESET',
  'EPIPE',
  'ETIMEDOUT'
]);

// The driver's own errors for a connection that dropped under a query have no
// code: the socket ended (a crash, an immediate shutdown, a pooler that killed it).
const DROPPED_CONNECTION_MESSAGES: ReadonlySet<string> = new Set([
  'Connection terminated unexpectedly',
  'Client has encountered a connection error and is not queryable'
]);

const TRANSIENT_DNS_CODES: ReadonlySet<string> = new Set([
  'ENOTFOUND',
  'EAI_AGAIN'
]);

const TRANSIENT_HTTP_STATUSES: ReadonlySet<number> = new Set([
  408, 425, 429, 500, 502, 503, 504
]);

/**
 * A failure of the database that can go away by itself (D-20). A constraint (class
 * 23), bad data (class 22) and the rest fail at once.
 */
export function isTransientDatabaseError(error: unknown): boolean {
  const code = (error as { code?: unknown } | null)?.code;
  if (typeof code !== 'string') {
    return (
      error instanceof Error && DROPPED_CONNECTION_MESSAGES.has(error.message)
    );
  }
  return (
    TRANSIENT_SQLSTATES.has(code) ||
    code.startsWith('08') ||
    TRANSIENT_SOCKET_CODES.has(code)
  );
}

/**
 * A failure to fetch an image that can go away by itself (D-20): the connection
 * refused or reset, a DNS failure, a timeout, and the HTTP statuses 408, 425,
 * 429, 500, 502, 503 and 504. Another 4xx answer, a page that is not an image or
 * an image that is too large will be the same next time.
 */
export function isTransientImageError(error: unknown): boolean {
  if (!(error instanceof ImageError)) {
    return false;
  }
  if (error.reason === 'timeout') {
    return true;
  }
  if (error.reason === 'network') {
    const code = String(error.params.code);
    return TRANSIENT_SOCKET_CODES.has(code) || TRANSIENT_DNS_CODES.has(code);
  }
  if (error.reason === 'http_status') {
    return TRANSIENT_HTTP_STATUSES.has(Number(error.params.status));
  }
  return false;
}

export interface RetryOptions {
  isTransient: (error: unknown) => boolean;
  /** The Clock port's `sleep`. */
  sleep: (ms: number) => Promise<void>;
  /** Called before each wait, with the failure and the number of the retry. */
  onRetry?: (error: unknown, retry: number) => void;
  /** When it is aborted, the failure is thrown at once and nobody waits. */
  signal?: AbortSignal;
}

/**
 * Runs `work`. A transient failure is retried up to 3 times, after 1 s, 3 s and
 * 9 s (D-20), before it is thrown; any other failure is thrown at once. A row
 * that succeeds on a retry is a success.
 */
export async function withRetries<T>(
  work: () => Promise<T>,
  options: RetryOptions
): Promise<T> {
  for (let retry = 0; ; retry += 1) {
    try {
      return await work();
    } catch (error) {
      if (
        retry >= RETRY_WAITS_MS.length ||
        options.signal?.aborted ||
        !options.isTransient(error)
      ) {
        throw error;
      }
      options.onRetry?.(error, retry + 1);
      await options.sleep(RETRY_WAITS_MS[retry]);
    }
  }
}
