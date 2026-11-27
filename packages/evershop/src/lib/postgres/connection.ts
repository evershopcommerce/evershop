import fs from 'fs';
import { PoolClient } from '@evershop/postgres-query-builder';
import { Pool } from 'pg';
import type { PoolConfig } from 'pg';
import { debug, warning } from '../log/logger.js';
import { getConfig } from '../util/getConfig.js';
import { getPoolSettings } from './poolSettings.js';
import { applySessionSettings, getTimeoutStatements } from './sessionSettings.js';

// Use env for the database connection, maintain the backward compatibility
const connectionSetting: PoolConfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT as unknown as number,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  // DB_POOL_MAX (default 20) and DB_POOL_TIMEOUT_MS (default 0, no limit),
  // see poolSettings.ts; a mistyped value throws here, at start. The event
  // process builds its LISTEN client from these settings too: the client
  // ignores `max` and keeps the connect timeout.
  ...getPoolSettings(process.env)
};

// Support SSL
const sslMode = process.env.DB_SSLMODE;
switch (sslMode) {
  case 'disable': {
    connectionSetting.ssl = false;
    break;
  }
  case 'require':
  case 'prefer':
  case 'verify-ca':
  case 'verify-full': {
    const ssl: PoolConfig['ssl'] = {
      rejectUnauthorized: true
    };
    const ca = process.env.DB_SSLROOTCERT;
    if (ca) {
      ssl.ca = fs.readFileSync(ca).toString();
    }
    const cert = process.env.DB_SSLCERT;
    if (cert) {
      ssl.cert = fs.readFileSync(cert).toString();
    }
    const key = process.env.DB_SSLKEY;
    if (key) {
      ssl.key = fs.readFileSync(key).toString();
    }
    connectionSetting.ssl = ssl;
    break;
  }
  case 'no-verify': {
    connectionSetting.ssl = {
      rejectUnauthorized: false
    };
    break;
  }
  default: {
    connectionSetting.ssl = false;
    break;
  }
}

// Optional per-process limits (DB_LOCK_TIMEOUT_MS, DB_STATEMENT_TIMEOUT_MS).
// Read once, here, so that a mistyped value stops the process at start.
const timeoutStatements = getTimeoutStatements(process.env);

// onConnect is awaited by pg before the client is handed to user code,
// unlike pool.on('connect', ...) which is not awaited (deprecated in pg@8.19.0).
// Cast needed because @types/pg doesn't yet declare onConnect in PoolConfig.
const pool = new Pool({
  ...connectionSetting,
  onConnect: async (client: import('pg').PoolClient) => {
    await applySessionSettings(client, {
      timeZone: getConfig('shop.timezone', 'UTC'),
      timeoutStatements
    });
  }
} as PoolConfig);

// A connection can break while the process runs: the database restarts (a
// reboot, a failover, a version upgrade), an administrator ends it, or the
// network drops it. node-postgres reports it as an 'error' event, and an
// 'error' event with no listener is thrown. The logger's exception handler
// (winston, `exitOnError`) then ends the process within 3 s, so before these
// two listeners every database restart stopped the web, event and cron
// processes of every store.
//
// An idle connection: the pool has already removed it and opens a new one for
// the next query, so a warning is all it needs.
pool.on('error', (e: Error) => {
  warning(
    `PostgreSQL closed an idle connection (${e.message}). The pool opens a new one when it is needed.`
  );
});
// A connection in use: the pool does not listen to it while it is checked
// out. Its owner's query fails, or the next one does, and is handled there;
// the pool drops the connection when it is released. This listener only keeps
// the event from being thrown.
pool.on('connect', (client: import('pg').PoolClient) => {
  client.on('error', (e: Error) => {
    debug(`PostgreSQL closed a connection that was in use (${e.message}).`);
  });
});

async function getConnection(): Promise<PoolClient> {
  return await pool.connect();
}

export { pool, getConnection, connectionSetting };
