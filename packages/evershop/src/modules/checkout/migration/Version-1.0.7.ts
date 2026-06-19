import { execute } from '@evershop/postgres-query-builder';

export default async (connection) => {
  await execute(
    connection,
    `ALTER TABLE "cart_item" ADD COLUMN IF NOT EXISTS no_shipping_required boolean DEFAULT FALSE`
  );

  await execute(
    connection,
    `ALTER TABLE "cart" ADD COLUMN IF NOT EXISTS no_shipping_required boolean DEFAULT FALSE`
  );
};
