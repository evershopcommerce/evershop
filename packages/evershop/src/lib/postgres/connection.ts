import fs from 'fs';
import { PoolClient } from '@evershop/postgres-query-builder';
import { Pool } from 'pg';
import type { PoolConfig } from 'pg';
import { getConfig } from '../util/getConfig.js';

// Use env for the database connection, maintain the backward compatibility
const connectionSetting: PoolConfig = {
  host: process.env.DB_HOST || getConfig('system.database.host'),
  port:
    (process.env.DB_PORT as unknown as number) ||
    (getConfig('system.database.port') as unknown as number),
  user: process.env.DB_USER || getConfig('system.database.user'),
  password: process.env.DB_PASSWORD || getConfig('system.database.password'),
  database: process.env.DB_NAME || getConfig('system.database.database'),
  max: 20
};

// Support SSL
const sslMode = process.env.DB_SSLMODE || getConfig('system.database.ssl_mode');
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

const pool = new Pool(connectionSetting);
// Set the timezone
pool.on('connect', (client) => {
  const timeZone = getConfig('shop.timezone', 'UTC');
  client.query(`SET TIMEZONE TO "${timeZone}";`);
});

async function getConnection(): Promise<PoolClient> {
  return await pool.connect();
}

export { pool, getConnection };
