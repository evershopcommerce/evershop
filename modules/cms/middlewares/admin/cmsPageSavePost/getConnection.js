const { startTransaction } = require('@nodejscart/mysql-query-builder');
const { getConnection } = require('../../../../../lib/mysql/connection');

module.exports = async (request, response) => {
    let connection = await getConnection();
    await startTransaction(connection);

    return connection;
}