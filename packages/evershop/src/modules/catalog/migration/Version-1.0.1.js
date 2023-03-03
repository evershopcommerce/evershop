const { execute } = require('@evershop/mysql-query-builder');

// eslint-disable-next-line no-multi-assign
module.exports = exports = async (connection) => {
  await execute(
    connection,
    'UPDATE product SET visibility = 1 WHERE visibility IS NULL'
  );
  await execute(
    connection,
    'ALTER TABLE product MODIFY COLUMN visibility smallint(2) NOT NULL DEFAULT 1'
  );
};
