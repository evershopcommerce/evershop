const mysql = require('mysql');
const util = require('util');

const pool = mysql.createPool({
    host: "localhost",
    user: "root",
    password: "123456",
    database: "testinstallation",
    dateStrings: true
});

async function getConnection() {
    return await util.promisify(pool.getConnection).bind(pool)();
}

export { pool, getConnection }