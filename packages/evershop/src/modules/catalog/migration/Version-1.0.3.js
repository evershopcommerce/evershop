const { execute } = require('@evershop/postgres-query-builder');

// eslint-disable-next-line no-multi-assign
module.exports = exports = async (connection) => {
  // Remove the inventory from the product table
  await execute(
    connection,
    `ALTER TABLE product DROP COLUMN qty, DROP COLUMN manage_stock, DROP COLUMN stock_availability;`
  );
};
