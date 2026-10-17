/**
 * Session settings applied to every connection of the pool (`onConnect` in
 * `connection.ts`).
 *
 * `DB_LOCK_TIMEOUT_MS` and `DB_STATEMENT_TIMEOUT_MS` give ONE process its own
 * `lock_timeout` and `statement_timeout`, in milliseconds. Only the environment
 * of a process that wants them sets them (the import worker, so that it fails
 * fast instead of queueing behind a storefront lock); the web, event and cron
 * processes leave them unset and keep the server's own settings. `0` means "no
 * limit", as it does in PostgreSQL.
 *
 * They are `SET` on the session, so behind a transaction-mode connection pooler
 * (PgBouncer in `transaction` mode) they do not stick: the next transaction may
 * run on another server connection. A caller that must have the limit inside a
 * transaction runs `SET LOCAL` itself.
 */
const TIMEOUTS = [
  { env: 'DB_LOCK_TIMEOUT_MS', setting: 'lock_timeout' },
  { env: 'DB_STATEMENT_TIMEOUT_MS', setting: 'statement_timeout' }
] as const;

// PostgreSQL keeps both settings as a 32-bit number of milliseconds.
const MAX_MS = 2147483647;

/**
 * The `SET` statements for the timeouts the environment asks for, in a fixed
 * order. A variable that is unset or empty adds nothing. A value that is not a
 * whole number of milliseconds throws: a mistyped limit must not be ignored
 * silently, because the process would then run without it.
 */
export function getTimeoutStatements(env: NodeJS.ProcessEnv): string[] {
  const statements: string[] = [];
  TIMEOUTS.forEach(({ env: name, setting }) => {
    const raw = env[name]?.trim();
    if (raw === undefined || raw === '') {
      return;
    }
    if (!/^\d+$/.test(raw) || Number(raw) > MAX_MS) {
      throw new Error(
        `${name} must be a whole number of milliseconds from 0 to ${MAX_MS} (0 means no limit), got "${raw}"`
      );
    }
    // The value is digits only, so it is safe to put in the statement.
    statements.push(`SET ${setting} = ${Number(raw)}`);
  });
  return statements;
}

/** The part of a pg client that the session setup needs. */
export interface SessionClient {
  query(sql: string): Promise<unknown>;
}

/** Time zone first (as before), then the timeouts. */
export async function applySessionSettings(
  client: SessionClient,
  settings: { timeZone: string; timeoutStatements: string[] }
): Promise<void> {
  await client.query(`SET TIMEZONE TO "${settings.timeZone}";`);
  for (const statement of settings.timeoutStatements) {
    await client.query(statement);
  }
}
