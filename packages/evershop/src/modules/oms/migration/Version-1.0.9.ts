import { execute } from '@evershop/postgres-query-builder';
import type { PoolClient } from 'pg';

/**
 * Package management (parcel sizing) — schema, part 3 of 3.
 * See wiki/package-management-design.md.
 *
 * `order_item` dimension snapshots: copied from `cart_item` at placement via
 * `orderCreator`'s `...item.export()` spread (column names match the cart
 * item fields, so the copy is automatic) and never touched again — an order
 * is an immutable record; editing or deleting a package later cannot alter
 * it. That's also why there is no FK from order rows to `package`.
 *
 * Consumed by `buildCreateLabelInput` (oms/services/createShipment.ts):
 * per-item `CarrierItem.dimensions` + the per-shipment
 * `CreateLabelInput.parcel` (dims + goods+tare weight).
 */
export default async (connection: PoolClient) => {
  await execute(
    connection,
    `ALTER TABLE "order_item"
       ADD COLUMN IF NOT EXISTS "package_length" decimal(12,2),
       ADD COLUMN IF NOT EXISTS "package_width" decimal(12,2),
       ADD COLUMN IF NOT EXISTS "package_height" decimal(12,2),
       ADD COLUMN IF NOT EXISTS "package_weight" decimal(12,4)`
  );
};
