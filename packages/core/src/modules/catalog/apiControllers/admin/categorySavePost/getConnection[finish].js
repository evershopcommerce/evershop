const { startTransaction } = require('@nodejscart/mysql-query-builder');
const { getConnection } = require('../../../../../lib/mysql/connection');

// eslint-disable-next-line no-unused-vars
module.exports = async (request, response) => {
  const connection = await getConnection();
  await startTransaction(connection);

  return connection;
};
