import { execute } from '@evershop/postgres-query-builder';

export default async (connection) => {
  // Add a column 'sub_total' to the order item table if it does not exist
  await execute(
    connection,
    'ALTER TABLE "cart_item" ADD COLUMN IF NOT EXISTS "sub_total" decimal(12,4)'
  );

  // For existing order items, calculate the sub_total = quantity * final_price
  await execute(
    connection,
    'UPDATE "cart_item" SET sub_total = qty * final_price'
  );

  // Add a column 'sub_total' to the order item table if it does not exist
  await execute(
    connection,
    'ALTER TABLE "order_item" ADD COLUMN IF NOT EXISTS "sub_total" decimal(12,4)'
  );

  // For existing order items, calculate the sub_total = quantity * final_price
  await execute(
    connection,
    'UPDATE "order_item" SET sub_total = qty * final_price'
  );

  // Add a column 'sub_total_incl_tax' to the cart table if it does not exist
  await execute(
    connection,
    'ALTER TABLE "cart" ADD COLUMN IF NOT EXISTS "sub_total_incl_tax" decimal(12,4)'
  );

  // For existing carts, calculate the sub_total_incl_tax = sub_total + tax_amount
  await execute(
    connection,
    'UPDATE "cart" SET sub_total_incl_tax = sub_total + tax_amount'
  );

  // Add a column 'sub_total_incl_tax' to the order table if it does not exist
  await execute(
    connection,
    'ALTER TABLE "order" ADD COLUMN IF NOT EXISTS "sub_total_incl_tax" decimal(12,4)'
  );

  // For existing orders, calculate the sub_total_incl_tax = sub_total + tax_amount
  await execute(
    connection,
    'UPDATE "order" SET sub_total_incl_tax = sub_total + tax_amount'
  );
};
