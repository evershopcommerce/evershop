import { execute } from '@evershop/postgres-query-builder';

export default async (connection) => {
  // Rename sub_total column to line_total
  await execute(
    connection,
    `ALTER TABLE "cart_item" RENAME COLUMN sub_total TO line_total`
  );

  await execute(
    connection,
    `ALTER TABLE "order_item" RENAME COLUMN sub_total TO line_total`
  );

  // Rename total column to line_total_incl_tax
  await execute(
    connection,
    `ALTER TABLE "cart_item" RENAME COLUMN total TO line_total_incl_tax`
  );

  await execute(
    connection,
    `ALTER TABLE "order_item" RENAME COLUMN total TO line_total_incl_tax`
  );

  // Add a column 'tax_amount_before_discount' to the cart item table if it does not exist
  await execute(
    connection,
    'ALTER TABLE "cart_item" ADD COLUMN IF NOT EXISTS "tax_amount_before_discount" decimal(12,4)'
  );

  // Add a column 'tax_amount_before_discount' to the order item table if it does not exist
  await execute(
    connection,
    'ALTER TABLE "order_item" ADD COLUMN IF NOT EXISTS "tax_amount_before_discount" decimal(12,4)'
  );

  // Add a column 'tax_amount_before_discount' to the cart table if it does not exist
  await execute(
    connection,
    'ALTER TABLE "cart" ADD COLUMN IF NOT EXISTS "tax_amount_before_discount" decimal(12,4)'
  );

  // Add a column 'tax_amount_before_discount' to the order table if it does not exist
  await execute(
    connection,
    'ALTER TABLE "order" ADD COLUMN IF NOT EXISTS "tax_amount_before_discount" decimal(12,4)'
  );

  // Add a column 'line_total_with_discount' to the cart item table if it does not exist
  await execute(
    connection,
    'ALTER TABLE "cart_item" ADD COLUMN IF NOT EXISTS "line_total_with_discount" decimal(12,4)'
  );

  // Add a column 'line_total_with_discount_incl_tax' to the cart item table if it does not exist
  await execute(
    connection,
    'ALTER TABLE "cart_item" ADD COLUMN IF NOT EXISTS "line_total_with_discount_incl_tax" decimal(12,4)'
  );

  // Add a column 'line_total_with_discount' to the order item table if it does not exist
  await execute(
    connection,
    'ALTER TABLE "order_item" ADD COLUMN IF NOT EXISTS "line_total_with_discount" decimal(12,4)'
  );

  // Add a column 'line_total_with_discount_incl_tax' to the order item table if it does not exist
  await execute(
    connection,
    'ALTER TABLE "order_item" ADD COLUMN IF NOT EXISTS "line_total_with_discount_incl_tax" decimal(12,4)'
  );

  // Add a column 'sub_total_with_discount' to the cart table if it does not exist
  await execute(
    connection,
    'ALTER TABLE "cart" ADD COLUMN IF NOT EXISTS "sub_total_with_discount" decimal(12,4)'
  );

  // Add a column 'sub_total_with_discount' to the order table if it does not exist
  await execute(
    connection,
    'ALTER TABLE "order" ADD COLUMN IF NOT EXISTS "sub_total_with_discount" decimal(12,4)'
  );

  // Add a column 'sub_total_with_discount_incl_tax' to the cart table if it does not exist
  await execute(
    connection,
    'ALTER TABLE "cart" ADD COLUMN IF NOT EXISTS "sub_total_with_discount_incl_tax" decimal(12,4)'
  );

  // Add a column 'sub_total_with_discount_incl_tax' to the order table if it does not exist
  await execute(
    connection,
    'ALTER TABLE "order" ADD COLUMN IF NOT EXISTS "sub_total_with_discount_incl_tax" decimal(12,4)'
  );

  // Add a column 'shipping_tax_amount' to the cart table if it does not exist
  await execute(
    connection,
    'ALTER TABLE "cart" ADD COLUMN IF NOT EXISTS "shipping_tax_amount" decimal(12,4)'
  );

  // Add a column 'shipping_tax_amount' to the order table if it does not exist
  await execute(
    connection,
    'ALTER TABLE "order" ADD COLUMN IF NOT EXISTS "shipping_tax_amount" decimal(12,4)'
  );

  // Calculate the value for the new columns 'tax_amount_before_discount', 'line_total_with_discount', 'line_total_with_discount_incl_tax', 'sub_total'

  await execute(
    connection,
    `UPDATE "cart_item" SET tax_amount_before_discount = ROUND(COALESCE(final_price, 0) * (COALESCE(tax_percent, 0) / 100), 2) * qty`
  );

  await execute(
    connection,
    `UPDATE "order_item" SET tax_amount_before_discount = ROUND(COALESCE(final_price, 0) * (COALESCE(tax_percent, 0) / 100), 2) * qty`
  );

  // Calculate the tax_amount_before_discount on cart and order by summing up the tax_amount_before_discount of all items
  await execute(
    connection,
    `UPDATE "cart" SET tax_amount_before_discount = (SELECT SUM(tax_amount_before_discount) FROM cart_item WHERE cart_item.cart_id = cart.cart_id)`
  );

  await execute(
    connection,
    `UPDATE "order" SET tax_amount_before_discount = (SELECT SUM(tax_amount_before_discount) FROM "order_item" WHERE "order_item".order_item_order_id = "order".order_id)`
  );

  await execute(
    connection,
    `UPDATE "cart_item" SET line_total_with_discount = line_total`
  );

  await execute(
    connection,
    `UPDATE "cart_item" SET line_total = COALESCE(final_price, 0) * qty`
  );

  await execute(
    connection,
    `UPDATE "order_item" SET line_total_with_discount = line_total`
  );

  await execute(
    connection,
    `UPDATE "order_item" SET line_total = COALESCE(final_price, 0) * qty`
  );

  await execute(
    connection,
    `UPDATE "cart_item" SET line_total_with_discount_incl_tax = line_total_with_discount + tax_amount`
  );

  await execute(
    connection,
    `UPDATE "order_item" SET line_total_with_discount_incl_tax = line_total_with_discount + tax_amount`
  );

  await execute(
    connection,
    `UPDATE "cart" SET sub_total_with_discount = (SELECT SUM(line_total_with_discount) FROM cart_item WHERE cart_item.cart_id = cart.cart_id)`
  );

  await execute(
    connection,
    `UPDATE "order" SET sub_total_with_discount = (SELECT SUM(line_total_with_discount) FROM "order_item" WHERE "order_item".order_item_order_id = "order".order_id)`
  );

  await execute(
    connection,
    `UPDATE "cart" SET sub_total_with_discount_incl_tax = sub_total_with_discount + tax_amount`
  );

  await execute(
    connection,
    `UPDATE "order" SET sub_total_with_discount_incl_tax = sub_total_with_discount + tax_amount`
  );

  // Add a column 'total_tax_amount' to the cart table if it does not exist
  await execute(
    connection,
    'ALTER TABLE "cart" ADD COLUMN IF NOT EXISTS "total_tax_amount" decimal(12,4)'
  );

  // Update the value for the new column 'total_tax_amount' on the cart table get value from the `tax_amount` column
  await execute(connection, `UPDATE "cart" SET total_tax_amount = tax_amount`);

  // Add a column 'total_tax_amount' to the order table if it does not exist
  await execute(
    connection,
    'ALTER TABLE "order" ADD COLUMN IF NOT EXISTS "total_tax_amount" decimal(12,4)'
  );

  // Update the value for the new column 'total_tax_amount' on the cart table get value from the `tax_amount` column
  await execute(connection, `UPDATE "order" SET total_tax_amount = tax_amount`);
};
