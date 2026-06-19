import { execute } from '@evershop/postgres-query-builder';
import type { PoolClient } from 'pg';

/**
 * Carrier-interface completion (#1 of the post-§6 audit) — service-code
 * threading.
 *
 * Adds `default_service_code` to `core_shipping_method`, the second leg of
 * the merchant-chosen-default pair that began with `default_carrier_code` in
 * 1.0.4. `coreProvider.getMethods` emits it as `ShippingMethod.serviceCode`;
 * the checkout writes it into `shipping_method_data.snapshot.serviceCode`;
 * `createShipment.buildCreateLabelInput` reads it back and writes it to
 * `CreateLabelInput.serviceCode` so the carrier can buy the exact service
 * the customer paid for. Without this, every `createLabel` call ran with
 * `serviceCode: undefined` and the carrier silently picked its default —
 * meaning a merchant configured for FedEx Ground could end up shipping
 * everything as FedEx First Overnight.
 *
 * `varchar` (no enum) because service codes are carrier-specific tokens
 * that core has no business validating — see `CreateLabelInput.serviceCode`
 * doc in `modules/oms/types/carrier.ts`.
 *
 * Verifies the new multi-digit-friendly migration regex
 * (`bin/lib/bootstrap/migrate.js`); the old regex would have silently
 * skipped any `Version-X.Y.10+`.
 */
export default async (connection: PoolClient) => {
  await execute(
    connection,
    `ALTER TABLE "core_shipping_method" ADD COLUMN IF NOT EXISTS "default_service_code" varchar`
  );
};
