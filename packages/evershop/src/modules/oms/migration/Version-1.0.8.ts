import { execute } from '@evershop/postgres-query-builder';
import type { PoolClient } from 'pg';

/**
 * Carrier-interface follow-up — persist `LabelResult.trackingUrl` so
 * aggregator extensions (Shippo, EasyPost, ShipStation) can surface a real
 * carrier tracking page without needing `generateTrackingUrl`.
 *
 * Background. `Carrier.generateTrackingUrl(ctx)` is synchronous and the
 * `CarrierMethodContext` envelope intentionally doesn't carry the
 * underlying-carrier hint. That's fine for single-carrier extensions
 * (FedEx, UPS, USPS) which already know their own tracking URL template,
 * but aggregators get the URL from the carrier at label-purchase time
 * (Shippo's `tracking_url_provider`, EasyPost's `public_url`) and can't
 * reconstruct it later from just a tracking number — they'd need an async
 * API call which the resolver can't make.
 *
 * Fix. Have `createLabel` return an optional `trackingUrl` on
 * `LabelResult`; persist it on the shipment row; the `Shipment.trackingUrl`
 * resolver returns the persisted value when set, otherwise falls back to
 * `Carrier.generateTrackingUrl(ctx)` — backwards-compatible with
 * single-carrier extensions that never set it. Existing shipment rows have
 * `tracking_url = null` and continue to compose via `generateTrackingUrl`.
 */
export default async (connection: PoolClient) => {
  await execute(
    connection,
    `ALTER TABLE "shipment" ADD COLUMN IF NOT EXISTS "tracking_url" varchar`
  );
};
