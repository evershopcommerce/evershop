const { getConnection } = require('../../../../../lib/mysql/connection');
const { startTransaction } = require('@nodejscart/mysql-query-builder');

module.exports = async (request, response) => {
    let connection = await getConnection();
    startTransaction(connection);

    return connection;
}