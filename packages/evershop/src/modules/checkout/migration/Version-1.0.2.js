const { execute } = require('@evershop/mysql-query-builder');
const { pool } = require('../../../lib/mysql/connection');

// eslint-disable-next-line no-multi-assign
module.exports = exports = async () => {
  await execute(pool, `ALTER TABLE \`cart\` ADD \`uuid\` varchar(255) DEFAULT replace(uuid(),'-','') AFTER \`cart_id\``);
  await execute(pool, `ALTER TABLE \`order\` ADD \`uuid\` varchar(255) DEFAULT replace(uuid(),'-','') AFTER \`order_id\``);
  await execute(pool, `ALTER TABLE \`cart_item\` ADD \`uuid\` varchar(255) DEFAULT replace(uuid(),'-','') AFTER \`cart_item_id\``);
  await execute(pool, `ALTER TABLE \`order_item\` ADD \`uuid\` varchar(255) DEFAULT replace(uuid(),'-','') AFTER \`order_item_id\``);
  await execute(pool, `ALTER TABLE \`cart_address\` ADD \`uuid\` varchar(255) DEFAULT replace(uuid(),'-','') AFTER \`cart_address_id\``);
  await execute(pool, `ALTER TABLE \`order_address\` ADD \`uuid\` varchar(255) DEFAULT replace(uuid(),'-','') AFTER \`order_address_id\``);
  await execute(pool, `ALTER TABLE \`payment_transaction\` ADD \`uuid\` varchar(255) DEFAULT replace(uuid(),'-','') AFTER \`payment_transaction_id\``);
  await execute(pool, `ALTER TABLE \`shipment\` ADD \`uuid\` varchar(255) DEFAULT replace(uuid(),'-','') AFTER \`shipment_id\``);
};
