import { execute } from '@evershop/postgres-query-builder';

/**
 * Shipping provider refactor — Phase 8 (drop legacy).
 *
 * Drops the columns and tables that Version-1.0.8 deliberately left behind
 * so the migration could be additive. By the time this runs:
 *   - order rows have been backfilled into `order.shipping_method_data` (1.0.8 step 9).
 *   - admin and storefront code no longer reads the legacy columns/tables.
 *   - the cart pipeline runs entirely on `cart.shipping_method_data`.
 *
 * After this migration, the legacy surface is gone:
 *   - `cart.shipping_method`, `cart.shipping_method_name`
 *   - `order.shipping_method`, `order.shipping_method_name`
 *   - `shipping_zone.country` (replaced by the `shipping_zone_country` table)
 *   - `shipping_zone_method` table (renamed conceptually to `core_shipping_method_rate`)
 *   - `shipping_method` table (renamed conceptually to `core_shipping_method`)
 *
 * See wiki/shipping-provider-design.md → "Migration plan" / phase 8.
 */
export default async (connection) => {
  // Drop dependent table first (FK on method_id → shipping_method).
  await execute(
    connection,
    `DROP TABLE IF EXISTS "shipping_zone_method"`
  );
  await execute(
    connection,
    `DROP TABLE IF EXISTS "shipping_method"`
  );

  // Drop the legacy single-country column on shipping_zone (multi-country now
  // lives in shipping_zone_country).
  await execute(
    connection,
    `ALTER TABLE "shipping_zone" DROP COLUMN IF EXISTS "country"`
  );

  // Drop the legacy varchar shipping selection columns on cart and order
  // (both replaced by shipping_method_data JSONB).
  await execute(
    connection,
    `ALTER TABLE "cart" DROP COLUMN IF EXISTS "shipping_method"`
  );
  await execute(
    connection,
    `ALTER TABLE "cart" DROP COLUMN IF EXISTS "shipping_method_name"`
  );
  await execute(
    connection,
    `ALTER TABLE "order" DROP COLUMN IF EXISTS "shipping_method"`
  );
  await execute(
    connection,
    `ALTER TABLE "order" DROP COLUMN IF EXISTS "shipping_method_name"`
  );
};
