import { execute } from '@evershop/postgres-query-builder';
import type { PoolClient } from 'pg';

/**
 * Carrier-interface completion (#2 of the post-§6 audit).
 *
 * Adds two columns to `shipment` to back the new `CarrierMethodContext`
 * envelope passed to `generateTrackingUrl` / `voidLabel` / `fetchStatus`:
 *
 *   - `carrier_shipment_id` — the carrier's internal id (e.g. UPS's
 *     `ShipmentIdentificationNumber`), set from `LabelResult.carrierShipmentId`
 *     after a successful `createLabel` call. Required by some carriers' void
 *     and query APIs even when the tracking number is known.
 *   - `carrier_metadata` — JSONB blob for aggregator extensions (Shippo,
 *     EasyPost) to record the underlying carrier, rate id, etc. Read back
 *     into `CarrierMethodContext.metadata` on subsequent calls so the
 *     extension never needs a private tracking→carrier side table.
 *
 * Both are nullable. Existing rows (label purchased before this migration)
 * stay on null and the runtime envelope construction passes `undefined`
 * through — backwards-compatible at the carrier-extension level.
 */
export default async (connection: PoolClient) => {
  await execute(
    connection,
    `ALTER TABLE "shipment" ADD COLUMN IF NOT EXISTS "carrier_shipment_id" varchar`
  );
  await execute(
    connection,
    `ALTER TABLE "shipment" ADD COLUMN IF NOT EXISTS "carrier_metadata" jsonb`
  );
};
