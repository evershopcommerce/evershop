import { execute } from '@evershop/postgres-query-builder';

export default async (connection) => {
  await execute(
    connection,
    `ALTER TABLE product ADD COLUMN IF NOT EXISTS no_shipping_required boolean DEFAULT FALSE`
  );
};
