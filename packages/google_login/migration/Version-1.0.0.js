const { execute } = require('@evershop/postgres-query-builder');

// eslint-disable-next-line no-multi-assign
module.exports = exports = async (connection) => {
  // Add a column named `is_google_login` to `customer` table, after `password` column
  await execute(
    connection,
    `ALTER TABLE "customer" ADD COLUMN "is_google_login" boolean NOT NULL DEFAULT FALSE`
  );
};
