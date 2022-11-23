const { execute } = require('@evershop/mysql-query-builder');
const { pool } = require('../../../lib/mysql/connection');

// eslint-disable-next-line no-multi-assign
module.exports = exports = async () => {
  await execute(pool, `ALTER TABLE \`cart\` ADD \`sid\` text DEFAULT NULL AFTER \`user_ip\``);
  await execute(pool, `ALTER TABLE \`order\` ADD \`sid\` text DEFAULT NULL AFTER \`user_ip\``);
  await execute(pool, `ALTER TABLE \`cart_item\` ADD \`thumbnail\` text DEFAULT NULL AFTER \`product_name\``);
  await execute(pool, `ALTER TABLE \`order_item\` ADD \`thumbnail\` text DEFAULT NULL AFTER \`product_name\``);
};
