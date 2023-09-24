/* eslint-disable import/no-extraneous-dependencies */
const { Pool } = require('pg');
const fs = require('fs');
const { getConfig } = require('../util/getConfig');

// Use env for the database connection, maintain the backward compatibility
const connectionSetting = {
  host: process.env.DATABASE_HOST || getConfig('system.database.host'),
  port: process.env.DATABASE_PORT || getConfig('system.database.port'),
  user: process.env.DATABASE_USER || getConfig('system.database.user'),
  password:
    process.env.DATABASE_PASSWORD || getConfig('system.database.password'),
  database: process.env.DATABASE_NAME || getConfig('system.database.database'),
  max: 30,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
};

// Support SSL
const sslCA =
  process.env.DATABASE_SSL_CA || getConfig('system.database.ssl.ca');

if (sslCA) {
  connectionSetting.ssl = connectionSetting.ssl || {};
  connectionSetting.ssl.ca = fs.readFileSync(sslCA);
  connectionSetting.ssl.rejectUnauthorized = false;
}

const sslCERT =
  process.env.DATABASE_SSL_CERT || getConfig('system.database.ssl.cert');

if (sslCERT) {
  connectionSetting.ssl = connectionSetting.ssl || {};
  connectionSetting.ssl.cert = fs.readFileSync(sslCERT);
  connectionSetting.ssl.rejectUnauthorized = false;
}

const sslKEY =
  process.env.DATABASE_SSL_KEY || getConfig('system.database.ssl.key');

if (sslKEY) {
  connectionSetting.ssl = connectionSetting.ssl || {};
  connectionSetting.ssl.key = fs.readFileSync(sslKEY);
  connectionSetting.ssl.rejectUnauthorized = false;
}

const pool = new Pool(connectionSetting);

// Set the timezone
pool.on('connect', (client) => {
  const timeZone = getConfig('shop.timezone', 'UTC');
  client.query(`SET TIMEZONE TO "${timeZone}";`);
});

async function getConnection() {
  // eslint-disable-next-line no-return-await
  return await pool.connect();
}

// eslint-disable-next-line no-multi-assign
module.exports = exports = { pool, getConnection };
