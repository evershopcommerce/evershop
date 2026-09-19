import { execute } from '@evershop/postgres-query-builder';
import type { PoolClient } from 'pg';

/**
 * Package management (parcel sizing) — schema, part 2 of 3.
 * See wiki/package-management-design.md.
 *
 * `cart_item` dimension snapshots: copied from the product's package on every
 * cart rebuild (same refresh semantics as `product_weight`/price). NULL for
 * legacy products (no package yet) and non-shippable items. Values are in the
 * store's dimension unit (`shop.dimensionUnit`).
 *
 * `cart.packages`: the persisted packing proposal computed by the
 * `cartPackages` processor at rebuild (parity with `total_weight`). JSONB
 * array of parcels `{ packageUuid, name, length, width, height, tareWeight,
 * goodsWeight }`. The `total_weight` field resolver reads parcel tare from
 * here — per-item weights everywhere stay goods-only (no double counting).
 * At order placement `exportData()` includes this key but the `order` table
 * has no such column, so the query-builder drops it — order-side truth is
 * `order.total_weight` + per-item dims on `order_item`.
 */
export default async (connection: PoolClient) => {
  await execute(
    connection,
    `ALTER TABLE "cart_item"
       ADD COLUMN IF NOT EXISTS "package_length" decimal(12,2),
       ADD COLUMN IF NOT EXISTS "package_width" decimal(12,2),
       ADD COLUMN IF NOT EXISTS "package_height" decimal(12,2),
       ADD COLUMN IF NOT EXISTS "package_weight" decimal(12,4)`
  );

  await execute(
    connection,
    `ALTER TABLE "cart" ADD COLUMN IF NOT EXISTS "packages" jsonb`
  );
};
