const mysql = require('mysql');
const util = require('util');
const config = require('config');

module.exports = exports = {};

const pool = mysql.createPool({
    host: config.get("system.database.host"),
    port: config.get("system.database.port"),
    user: config.get("system.database.user"),
    password: config.get("system.database.password"),
    database: config.get("system.database.database"),
    dateStrings: true
});

async function getConnection() {
    return await util.promisify(pool.getConnection).bind(pool)();
}

module.exports = exports = { pool, getConnection }