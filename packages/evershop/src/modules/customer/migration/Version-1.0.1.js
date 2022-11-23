const { execute } = require('@evershop/mysql-query-builder');
const { pool } = require('../../../lib/mysql/connection');

// eslint-disable-next-line no-multi-assign
module.exports = exports = async () => {
  await execute(pool, `ALTER TABLE \`customer\` ADD \`uuid\` varchar(255) DEFAULT replace(uuid(),'-','') AFTER \`customer_id\``);
  await execute(pool, `ALTER TABLE \`customer_address\` ADD \`uuid\` varchar(255) DEFAULT replace(uuid(),'-','') AFTER \`customer_address_id\``);
};
