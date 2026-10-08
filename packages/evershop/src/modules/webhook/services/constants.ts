/** Maximum number of webhooks an admin can create. */
export const MAX_WEBHOOKS = 10;

/** Total attempts per delivery: 1 immediate + 4 retries. */
export const MAX_ATTEMPTS = 5;

/** Wait before retry n (index 0 = after the first failed attempt). */
export const BACKOFF_MINUTES = [1, 5, 30, 120];

/** A receiver must answer within this time or the attempt is a failure. */
export const REQUEST_TIMEOUT_MS = 10000;

/** A `sending` row older than this lost its worker (crash) and is reclaimed. */
export const STUCK_SENDING_MINUTES = 5;

/** New deliveries are not created for a webhook above this many pending rows. */
export const MAX_PENDING_PER_WEBHOOK = 10000;

/** Final `failed` rows are kept this long (or until retried). */
export const FAILED_RETENTION_DAYS = 30;

/** The `webhookLogLimit` setting: finished rows kept per webhook. */
export const DEFAULT_LOG_LIMIT = 100;
export const MIN_LOG_LIMIT = 10;
export const MAX_LOG_LIMIT = 1000;

/** Reserved topic sent only by the "Send test event" action. */
export const PING_TOPIC = 'webhook_ping';

/** Cron job: due deliveries claimed per tick, and sent at the same time. */
export const CLAIM_BATCH_SIZE = 50;
export const DELIVERY_CONCURRENCY = 10;

/** How long the event process caches the enabled webhooks and pending counts. */
export const WEBHOOK_CACHE_TTL_MS = 10000;

/** Skipped-delivery warnings are logged at most this often per webhook. */
export const WARN_INTERVAL_MS = 60000;

export const MAX_URL_LENGTH = 2048;
export const MAX_NAME_LENGTH = 255;
