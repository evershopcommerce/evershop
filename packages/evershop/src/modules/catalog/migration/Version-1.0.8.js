const { execute } = require('@evershop/postgres-query-builder');

// eslint-disable-next-line no-multi-assign
module.exports = exports = async (connection) => {
  // rename the image column in the product_image table to origin_image
  await execute(
    connection,
    `ALTER TABLE product ADD COLUMN IF NOT EXISTS product_type varchar`
  );
};
