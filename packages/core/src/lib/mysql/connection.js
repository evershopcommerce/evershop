const mysql = require('mysql');
const util = require('util');

module.exports = exports = {};

const pool = mysql.createPool({
    host: "localhost",
    port: 3306,
    user: "admin",
    password: "123456",
    database: "nodejscart",
    dateStrings: true
});

async function getConnection() {
    return await util.promisify(pool.getConnection).bind(pool)();
}

module.exports = exports = { pool, getConnection }