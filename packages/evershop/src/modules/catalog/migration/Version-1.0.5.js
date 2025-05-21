import { execute } from '@evershop/postgres-query-builder';

export default async (connection) => {
  // Create a GIN index for search on the product_description table using name and description column
  await execute(
    connection,
    `CREATE INDEX "PRODUCT_SEARCH_INDEX" ON product_description USING GIN (to_tsvector('simple', name || ' ' || description));`
  );
};
