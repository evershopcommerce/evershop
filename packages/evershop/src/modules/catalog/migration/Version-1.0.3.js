import { execute } from '@evershop/postgres-query-builder';

export default async (connection) => {
  // Remove the inventory from the product table
  await execute(
    connection,
    `ALTER TABLE product DROP COLUMN qty, DROP COLUMN manage_stock, DROP COLUMN stock_availability;`
  );
};
