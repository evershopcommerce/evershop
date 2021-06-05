const { getConnection, startTransaction } = require('../../../../../lib/mysql/connection');

module.exports = async (request, response) => {
    let connection = await getConnection();
    startTransaction(connection);

    return connection;
}