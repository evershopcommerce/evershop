const { execute } = require('@evershop/postgres-query-builder');

// eslint-disable-next-line no-multi-assign
module.exports = exports = async (connection) => {
  await execute(
    connection,
    `ALTER TABLE "order" ADD COLUMN IF NOT EXISTS "status" varchar DEFAULT NULL;`
  );
};
