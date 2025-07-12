import { execute } from '@evershop/postgres-query-builder';

export default async (connection) => {
  await execute(
    connection,
    `ALTER TABLE "coupon" ALTER COLUMN "target_products" TYPE jsonb USING "target_products"::jsonb`
  );

  await execute(
    connection,
    `ALTER TABLE "coupon" ALTER COLUMN "condition" TYPE jsonb USING "condition"::jsonb`
  );

  await execute(
    connection,
    `ALTER TABLE "coupon" ALTER COLUMN "user_condition" TYPE jsonb USING "user_condition"::jsonb`
  );

  await execute(
    connection,
    `ALTER TABLE "coupon" ALTER COLUMN "buyx_gety" TYPE jsonb USING "buyx_gety"::jsonb`
  );
};
