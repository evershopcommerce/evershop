const { execute } = require('@evershop/postgres-query-builder');

// eslint-disable-next-line no-multi-assign
module.exports = exports = async (connection) => {
  await execute(
    connection,
    `CREATE TABLE "store" (
      "customer_id" VARCHAR PRIMARY KEY,
      "shop_name" VARCHAR NOT NULL,
      "rating" REAL DEFAULT NULL,
      "total_sales" INT DEFAULT NULL,
      "product_count" INT DEFAULT NULL
    )`
  );
};