const { execute } = require('@evershop/mysql-query-builder');

// eslint-disable-next-line no-multi-assign
module.exports = exports = async (connection) => {
  await execute(
    connection,
    'ALTER TABLE `coupon` MODIFY `condition` TEXT NULL DEFAULT NULL'
  );
  await execute(
    connection,
    "ALTER TABLE `coupon` MODIFY uuid varchar(36) NOT NULL DEFAULT (replace(uuid(),'-',''))"
  );
  await execute(
    connection,
    'ALTER TABLE `coupon` ADD UNIQUE KEY `COUPON_UUID` (`uuid`)'
  );
};
