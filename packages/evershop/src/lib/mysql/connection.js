/* eslint-disable import/no-extraneous-dependencies */
const mysql = require('mysql2');
const util = require('util');
const fs = require('fs');
const { getConfig } = require('../util/getConfig');

const connectionSetting = {
  host: getConfig('system.database.host'),
  port: getConfig('system.database.port'),
  user: getConfig('system.database.user'),
  password: getConfig('system.database.password'),
  database: getConfig('system.database.database'),
  dateStrings: true,
  connectionLimit: 30
};

// Support SSL
if (getConfig('system.database.ssl.ca')) {
  connectionSetting.ssl = connectionSetting.ssl || {};
  connectionSetting.ssl.ca = fs.readFileSync(
    getConfig('system.database.ssl.ca')
  );
  connectionSetting.ssl.rejectUnauthorized = false;
}

if (getConfig('system.database.ssl.cert')) {
  connectionSetting.ssl = connectionSetting.ssl || {};
  connectionSetting.ssl.cert = fs.readFileSync(
    getConfig('system.database.ssl.cert')
  );
  connectionSetting.ssl.rejectUnauthorized = false;
}

if (getConfig('system.database.ssl.key')) {
  connectionSetting.ssl = connectionSetting.ssl || {};
  connectionSetting.ssl.key = fs.readFileSync(
    getConfig('system.database.ssl.key')
  );
  connectionSetting.ssl.rejectUnauthorized = false;
}

const pool = mysql.createPool(connectionSetting);

async function getConnection() {
  // eslint-disable-next-line no-return-await
  return await util.promisify(pool.getConnection).bind(pool)();
}

// eslint-disable-next-line no-multi-assign
module.exports = exports = { pool, getConnection };
