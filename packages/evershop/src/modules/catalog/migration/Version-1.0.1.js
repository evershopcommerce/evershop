const { execute } = require('@evershop/mysql-query-builder');
const { pool } = require('../../../lib/mysql/connection');

// eslint-disable-next-line no-multi-assign
module.exports = exports = async () => {
  await execute(
    pool,
    'UPDATE product SET visibility = 1 WHERE visibility IS NULL'
  );
  await execute(
    pool,
    'ALTER TABLE product MODIFY COLUMN visibility smallint(2) NOT NULL DEFAULT 1'
  );
};
