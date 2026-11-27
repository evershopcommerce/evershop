/**
 * The size of one process's pool, and how long a query waits for a
 * connection. Read once, when `connection.ts` loads, so that a mistyped value
 * stops the process at start instead of being ignored.
 *
 * `DB_POOL_MAX` (default 20): the most connections the pool of ONE process
 * opens. The web, event and cron processes of a store, and each running import
 * worker, have a pool of their own and read the same environment, so a store
 * needs up to 3 × DB_POOL_MAX + 1 connections (the 1 is the event process's
 * LISTEN connection), plus DB_POOL_MAX for each running import worker.
 *
 * `DB_POOL_TIMEOUT_MS` (default 0, no limit): how long a query waits for a
 * connection, a free one from a full pool or a new one being opened, before it
 * fails with "timeout exceeded when trying to connect". Without a limit a
 * query waits as long as it takes; with a small pool, code that holds one
 * connection while it waits for a second one from the same pool would wait
 * forever.
 */
export interface PoolSettings {
  max: number;
  connectionTimeoutMillis: number;
}

// The largest 32-bit number; for the timeout it is also the longest delay a
// Node timer takes.
const MAX_VALUE = 2147483647;

function readWholeNumber(
  env: NodeJS.ProcessEnv,
  name: string,
  { min, fallback, hint = '' }: { min: number; fallback: number; hint?: string }
): number {
  const raw = env[name]?.trim();
  if (raw === undefined || raw === '') {
    return fallback;
  }
  if (!/^\d+$/.test(raw) || Number(raw) < min || Number(raw) > MAX_VALUE) {
    throw new Error(
      `${name} must be a whole number from ${min} to ${MAX_VALUE}${hint}, got "${raw}"`
    );
  }
  return Number(raw);
}

export function getPoolSettings(env: NodeJS.ProcessEnv): PoolSettings {
  return {
    max: readWholeNumber(env, 'DB_POOL_MAX', { min: 1, fallback: 20 }),
    connectionTimeoutMillis: readWholeNumber(env, 'DB_POOL_TIMEOUT_MS', {
      min: 0,
      fallback: 0,
      hint: ' (0 means no limit)'
    })
  };
}
