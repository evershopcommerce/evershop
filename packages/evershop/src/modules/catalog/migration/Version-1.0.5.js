const { execute } = require('@evershop/postgres-query-builder');

// eslint-disable-next-line no-multi-assign
module.exports = exports = async (connection) => {
  // Create a GIN index for search on the product_description table using name and description column
  await execute(
    connection,
    `CREATE INDEX "PRODUCT_SEARCH_INDEX" ON product_description USING GIN (to_tsvector('simple', name || ' ' || description));`
  );
};
