import fs from 'fs';
import { PoolClient } from '@evershop/postgres-query-builder';
import { Pool } from 'pg';
import type { PoolConfig } from 'pg';
import { getConfig } from '../util/getConfig.js';
import { applySessionSettings, getTimeoutStatements } from './sessionSettings.js';

// Use env for the database connection, maintain the backward compatibility
const connectionSetting: PoolConfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT as unknown as number,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  max: 20
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

async function getConnection(): Promise<PoolClient> {
  return await pool.connect();
}

export { pool, getConnection, connectionSetting };
