const mysql = require('mysql');
const util = require('util');
const config = require('config');

const pool = mysql.createPool({
  host: config.get('system.database.host'),
  port: config.get('system.database.port'),
  user: config.get('system.database.user'),
  password: config.get('system.database.password'),
  database: config.get('system.database.database'),
  dateStrings: true,
  connectionLimit: 30
});

async function getConnection() {
  // eslint-disable-next-line no-return-await
  return await util.promisify(pool.getConnection).bind(pool)();
}

// eslint-disable-next-line no-multi-assign
module.exports = exports = { pool, getConnection };
