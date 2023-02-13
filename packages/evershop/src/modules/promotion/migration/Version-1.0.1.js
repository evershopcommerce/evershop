const { execute } = require('@evershop/mysql-query-builder');
const { pool } = require('../../../lib/mysql/connection');

// eslint-disable-next-line no-multi-assign
module.exports = exports = async () => {
  await execute(
    pool,
    'ALTER TABLE `coupon` MODIFY `condition` TEXT NULL DEFAULT NULL'
  );
  await execute(
    pool,
    "ALTER TABLE `coupon` MODIFY uuid varchar(36) NOT NULL DEFAULT (replace(uuid(),'-',''))"
  );
  await execute(
    pool,
    'ALTER TABLE `coupon` ADD UNIQUE KEY `COUPON_UUID` (`uuid`)'
  );
};
