import { execute } from '@evershop/postgres-query-builder';
import type { PoolClient } from 'pg';

/**
 * Multi-shipment refactor — Phase C1 (additive only).
 *
 * Adds the schema bits that Stream C (carrier integration) actually needs at
 * the data layer:
 *
 *   - shipment.label_url, shipment.label_format — purchased label artifacts
 *     stored as URLs (never the binary). `label_format` is the MIME type
 *     (e.g. `application/pdf`, `image/png`, `application/zpl`).
 *   - core_shipping_method.default_carrier_code — fulfillment hint for the
 *     ship dialog. Merchants choose a default carrier per Core method in
 *     the admin; the bridge writes it into `shipping_method_data.snapshot`
 *     at checkout, and `NewShipmentDialog` pre-selects it.
 *
 * No `carrier` table. An earlier draft of C1 introduced one to hold an admin
 * `is_enabled` / `sort_order` toggle per carrier, but the merchant's intent
 * ("I don't want to use FedEx") is already expressed by NOT picking FedEx in
 * the ship dialog and NOT setting `default_carrier_code = 'fedex'` on any
 * Core method. A separate global toggle was duplicate state. The runtime
 * carrier registry lives in memory only (services/carrier/registry.ts) and
 * persists nothing.
 *
 * NO drops. The legacy `oms.carriers` config block in `oms/bootstrap.ts` is
 * removed in this same phase (it was a static config map, not schema, so no
 * migration needed for that side).
 *
 * See wiki/multi-shipment-implementation-plan.md → "Phase C1" and
 * wiki/multi-shipment-design.md → "Carrier integration".
 */
export default async (connection: PoolClient) => {
  await execute(
    connection,
    `ALTER TABLE "shipment" ADD COLUMN IF NOT EXISTS "label_url" varchar`
  );
  await execute(
    connection,
    `ALTER TABLE "shipment" ADD COLUMN IF NOT EXISTS "label_format" varchar`
  );

  await execute(
    connection,
    `ALTER TABLE "core_shipping_method" ADD COLUMN IF NOT EXISTS "default_carrier_code" varchar`
  );
};
