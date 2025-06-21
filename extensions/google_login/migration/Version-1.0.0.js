const { execute } = require('@evershop/postgres-query-builder');

module.exports = exports = async (connection) => {
  // Add a column named `is_google_login` to `customer` table, after `password` column
  await execute(
    connection,
    `ALTER TABLE "customer" ADD COLUMN "is_google_login" boolean NOT NULL DEFAULT FALSE`
  );
};
