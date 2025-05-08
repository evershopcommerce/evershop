const { execute } = require('@evershop/postgres-query-builder');

module.exports = exports = async (connection) => {
  // rename the image column in the product_image table to origin_image
  await execute(
    connection,
    `ALTER TABLE category ADD COLUMN IF NOT EXISTS show_products boolean DEFAULT TRUE`
  );
};
