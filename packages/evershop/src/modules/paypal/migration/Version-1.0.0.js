const { execute } = require('@evershop/mysql-query-builder');
const { pool } = require('../../../lib/mysql/connection');

// eslint-disable-next-line no-multi-assign
module.exports = exports = async () => {
  await execute(pool, `ALTER TABLE \`order\` ADD \`integration_order_id\` varchar(255) DEFAULT NULL AFTER \`uuid\``);
};