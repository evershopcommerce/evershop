const mysql = require("mysql");
const util = require("util");

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

async function startTransaction(connection) {
    await util.promisify(connection.query).bind(connection)("SET autocommit = 0");
    await util.promisify(connection.query).bind(connection)("SET TRANSACTION ISOLATION LEVEL READ COMMITTED");
    await util.promisify(connection.query).bind(connection)("START TRANSACTION");
}

async function commit(connection) {
    await util.promisify(connection.query).bind(connection)("COMMIT");
    await connection.destroy();
}

async function rollback(connection) {
    await util.promisify(connection.query).bind(connection)("ROLLBACK");
    await connection.destroy();
}

export { pool, getConnection, startTransaction, commit, rollback }