const { execute } = require('@evershop/mysql-query-builder');

// eslint-disable-next-line no-multi-assign
module.exports = exports = async (connection) => {
  await execute(
    connection,
    'ALTER TABLE `order` ADD `integration_order_id` varchar(255) DEFAULT NULL AFTER `uuid`'
  );
};
