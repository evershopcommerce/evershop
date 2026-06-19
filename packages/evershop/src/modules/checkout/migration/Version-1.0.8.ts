import { execute } from '@evershop/postgres-query-builder';

/**
 * Shipping provider refactor — Phase 1 (additive only).
 *
 * Creates the new platform schema (shipping_zone_provider,
 * shipping_zone_country) and the Core provider's internal tables
 * (core_shipping_method, core_shipping_method_rate). Adds shipping_method_data
 * JSONB columns to cart and order. Adds a country column to
 * shipping_zone_province so province codes disambiguate when a zone covers
 * multiple countries. Replaces the buggy global-unique-on-province constraint
 * with a composite (zone_id, country, province) unique.
 *
 * Backfills:
 *   - shipping_zone_country from legacy shipping_zone.country
 *   - shipping_zone_province.country from each row's parent zone
 *   - core_shipping_method from shipping_method (uuid preserved for stable IDs)
 *   - core_shipping_method_rate from shipping_zone_method (calculate_api dropped)
 *   - order.shipping_method_data from legacy shipping_method/shipping_method_name
 *
 * Attaches the built-in Core provider to every existing zone via a soft
 * `provider_code = 'core'` reference. There is NO `shipping_provider` table —
 * the in-memory registry (`services/shipping/registry.ts`, fed by every
 * provider extension's `registerShippingProvider(...)` call at bootstrap) is
 * the single source of truth. Earlier drafts of this phase did create a
 * `shipping_provider` table to mirror the registry, but it was hoisted out
 * before release because (a) "installed = enabled" makes the global toggle
 * redundant and (b) no current consumer needed the global config form.
 * Per-zone config still lives in `shipping_zone_provider.config`. Secrets
 * live in `process.env`. Orphan attachments to uninstalled providers are
 * filtered at checkout via `getShippingProvider(code)` returning undefined.
 *
 * NO legacy drops in this migration. Old tables and columns coexist with the
 * new ones until phase 8 of the refactor.
 *
 * See wiki/shipping-provider-design.md for the design and
 * wiki/shipping-provider-implementation-plan.md for the phasing.
 */
export default async (connection) => {
  /* ────────────────────────────────────────────────────────────────────────
   * New platform tables: shipping_zone_provider (soft-ref to registry by
   * code; no FK to a provider table because there is no provider table) and
   * shipping_zone_country (multi-country junction).
   * ──────────────────────────────────────────────────────────────────────── */

  await execute(
    connection,
    `CREATE TABLE IF NOT EXISTS "shipping_zone_provider" (
      "shipping_zone_provider_id" INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
      "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
      "zone_id" INT NOT NULL,
      "provider_code" varchar NOT NULL,
      "is_enabled" boolean NOT NULL DEFAULT TRUE,
      "config" jsonb NOT NULL DEFAULT '{}'::jsonb,
      "sort_order" int NOT NULL DEFAULT 0,
      CONSTRAINT "ZONE_PROVIDER_UUID_UNIQUE" UNIQUE ("uuid"),
      CONSTRAINT "ZONE_PROVIDER_CODE_UNIQUE" UNIQUE ("zone_id", "provider_code"),
      CONSTRAINT "FK_ZP_ZONE" FOREIGN KEY ("zone_id")
        REFERENCES "shipping_zone" ("shipping_zone_id") ON DELETE CASCADE
    )`
  );

  await execute(
    connection,
    `CREATE INDEX IF NOT EXISTS "IDX_ZP_ZONE" ON "shipping_zone_provider" ("zone_id")`
  );
  await execute(
    connection,
    `CREATE INDEX IF NOT EXISTS "IDX_ZP_PROVIDER_CODE" ON "shipping_zone_provider" ("provider_code")`
  );

  await execute(
    connection,
    `CREATE TABLE IF NOT EXISTS "shipping_zone_country" (
      "shipping_zone_country_id" INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
      "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
      "zone_id" INT NOT NULL,
      "country" varchar NOT NULL,
      CONSTRAINT "SHIPPING_ZONE_COUNTRY_UUID_UNIQUE" UNIQUE ("uuid"),
      CONSTRAINT "ZONE_COUNTRY_UNIQUE" UNIQUE ("zone_id", "country"),
      CONSTRAINT "FK_SZC_ZONE" FOREIGN KEY ("zone_id")
        REFERENCES "shipping_zone" ("shipping_zone_id") ON DELETE CASCADE
    )`
  );

  await execute(
    connection,
    `CREATE INDEX IF NOT EXISTS "IDX_SZC_ZONE" ON "shipping_zone_country" ("zone_id")`
  );

  /* ────────────────────────────────────────────────────────────────────────
   * Core-provider-internal tables
   * ──────────────────────────────────────────────────────────────────────── */

  await execute(
    connection,
    `CREATE TABLE IF NOT EXISTS "core_shipping_method" (
      "core_shipping_method_id" INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
      "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
      "name" varchar NOT NULL,
      "is_enabled" boolean NOT NULL DEFAULT TRUE,
      "sort_order" int NOT NULL DEFAULT 0,
      CONSTRAINT "CORE_METHOD_UUID_UNIQUE" UNIQUE ("uuid"),
      CONSTRAINT "CORE_METHOD_NAME_UNIQUE" UNIQUE ("name")
    )`
  );

  await execute(
    connection,
    `CREATE TABLE IF NOT EXISTS "core_shipping_method_rate" (
      "core_shipping_method_rate_id" INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
      "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
      "method_id" INT NOT NULL,
      "zone_id" INT NOT NULL,
      "is_enabled" boolean NOT NULL DEFAULT TRUE,
      "cost" decimal(12,4),
      "condition_type" varchar,
      "min" decimal(12,4),
      "max" decimal(12,4),
      "price_based_cost" jsonb,
      "weight_based_cost" jsonb,
      CONSTRAINT "CORE_METHOD_RATE_UUID_UNIQUE" UNIQUE ("uuid"),
      CONSTRAINT "CORE_METHOD_RATE_UNIQUE" UNIQUE ("method_id", "zone_id"),
      CONSTRAINT "FK_CMR_METHOD" FOREIGN KEY ("method_id")
        REFERENCES "core_shipping_method" ("core_shipping_method_id") ON DELETE CASCADE,
      CONSTRAINT "FK_CMR_ZONE" FOREIGN KEY ("zone_id")
        REFERENCES "shipping_zone" ("shipping_zone_id") ON DELETE CASCADE
    )`
  );

  await execute(
    connection,
    `CREATE INDEX IF NOT EXISTS "IDX_CMR_METHOD" ON "core_shipping_method_rate" ("method_id")`
  );
  await execute(
    connection,
    `CREATE INDEX IF NOT EXISTS "IDX_CMR_ZONE" ON "core_shipping_method_rate" ("zone_id")`
  );

  /* ────────────────────────────────────────────────────────────────────────
   * New JSONB columns on cart and order
   * ──────────────────────────────────────────────────────────────────────── */

  await execute(
    connection,
    `ALTER TABLE "cart" ADD COLUMN IF NOT EXISTS "shipping_method_data" jsonb`
  );

  await execute(
    connection,
    `ALTER TABLE "order" ADD COLUMN IF NOT EXISTS "shipping_method_data" jsonb`
  );

  /* ────────────────────────────────────────────────────────────────────────
   * Add country column to shipping_zone_province; backfill from parent zone.
   * (Two-step add-then-alter because we need to populate existing rows before
   * applying NOT NULL.)
   * ──────────────────────────────────────────────────────────────────────── */

  await execute(
    connection,
    `ALTER TABLE "shipping_zone_province" ADD COLUMN IF NOT EXISTS "country" varchar`
  );

  await execute(
    connection,
    `UPDATE "shipping_zone_province" szp
       SET "country" = sz."country"
       FROM "shipping_zone" sz
       WHERE sz."shipping_zone_id" = szp."zone_id"
         AND szp."country" IS NULL`
  );

  await execute(
    connection,
    `ALTER TABLE "shipping_zone_province" ALTER COLUMN "country" SET NOT NULL`
  );

  /* ────────────────────────────────────────────────────────────────────────
   * Replace the global province unique constraint with a composite that
   * includes country. Province codes like "CA" mean California in US,
   * Catalonia in ES — they need to disambiguate per country.
   * ──────────────────────────────────────────────────────────────────────── */

  await execute(
    connection,
    `ALTER TABLE "shipping_zone_province"
       DROP CONSTRAINT IF EXISTS "SHIPPING_ZONE_PROVINCE_PROVINCE_UNIQUE"`
  );
  await execute(
    connection,
    `ALTER TABLE "shipping_zone_province"
       DROP CONSTRAINT IF EXISTS "SHIPPING_ZONE_PROVINCE_ZONE_COUNTRY_PROVINCE_UNIQUE"`
  );
  await execute(
    connection,
    `ALTER TABLE "shipping_zone_province"
       ADD CONSTRAINT "SHIPPING_ZONE_PROVINCE_ZONE_COUNTRY_PROVINCE_UNIQUE"
       UNIQUE ("zone_id", "country", "province")`
  );

  /* ────────────────────────────────────────────────────────────────────────
   * Attach the built-in Core provider to every existing zone. The registry
   * guarantees `'core'` is always resolvable (modules/checkout/bootstrap.ts
   * calls `registerShippingProvider(coreShippingProvider)` at startup), so
   * the attachment is safe to write without a sibling table. Idempotent via
   * ON CONFLICT for partial-migration replays.
   * ──────────────────────────────────────────────────────────────────────── */

  await execute(
    connection,
    `INSERT INTO "shipping_zone_provider" ("zone_id", "provider_code", "is_enabled")
       SELECT z."shipping_zone_id", 'core', TRUE
       FROM "shipping_zone" z
       ON CONFLICT ("zone_id", "provider_code") DO NOTHING`
  );

  /* ────────────────────────────────────────────────────────────────────────
   * Backfill shipping_zone_country from legacy shipping_zone.country.
   * ──────────────────────────────────────────────────────────────────────── */

  await execute(
    connection,
    `INSERT INTO "shipping_zone_country" ("zone_id", "country")
       SELECT "shipping_zone_id", "country"
       FROM "shipping_zone"
       WHERE "country" IS NOT NULL
       ON CONFLICT ("zone_id", "country") DO NOTHING`
  );

  /* ────────────────────────────────────────────────────────────────────────
   * Migrate shipping_method → core_shipping_method (preserve uuid so the
   * legacy order.shipping_method varchar values continue to resolve once
   * the new code reads from the new tables).
   * ──────────────────────────────────────────────────────────────────────── */

  await execute(
    connection,
    `INSERT INTO "core_shipping_method" ("uuid", "name", "is_enabled", "sort_order")
       SELECT "uuid", "name", TRUE, 0
       FROM "shipping_method"
       ON CONFLICT ("uuid") DO NOTHING`
  );

  /* ────────────────────────────────────────────────────────────────────────
   * Migrate shipping_zone_method → core_shipping_method_rate.
   * calculate_api is intentionally not copied — it's replaced by the provider
   * abstraction. Shops that relied on it must migrate to a custom provider
   * extension before this branch lands.
   * ──────────────────────────────────────────────────────────────────────── */

  await execute(
    connection,
    `INSERT INTO "core_shipping_method_rate"
       ("method_id", "zone_id", "is_enabled", "cost", "condition_type",
        "min", "max", "price_based_cost", "weight_based_cost")
     SELECT
       csm."core_shipping_method_id",
       zm."zone_id",
       zm."is_enabled", zm."cost", zm."condition_type",
       zm."min", zm."max", zm."price_based_cost", zm."weight_based_cost"
     FROM "shipping_zone_method" zm
     JOIN "shipping_method" sm ON sm."shipping_method_id" = zm."method_id"
     JOIN "core_shipping_method" csm ON csm."uuid" = sm."uuid"
     ON CONFLICT ("method_id", "zone_id") DO NOTHING`
  );

  /* ────────────────────────────────────────────────────────────────────────
   * Backfill order.shipping_method_data from the legacy varchar columns.
   * snapshot.cost uses shipping_fee_excl_tax (the historically-charged
   * amount). carrier and delivery are absent in old data — left undefined.
   * provider_code is always 'core' for legacy orders.
   * ──────────────────────────────────────────────────────────────────────── */

  await execute(
    connection,
    `UPDATE "order"
       SET "shipping_method_data" = jsonb_build_object(
         'provider_code', 'core',
         'method_code',   "shipping_method",
         'snapshot', jsonb_build_object(
           'code', "shipping_method",
           'name', COALESCE("shipping_method_name", "shipping_method"),
           'cost', COALESCE("shipping_fee_excl_tax", 0)
         )
       )
       WHERE "shipping_method" IS NOT NULL
         AND "shipping_method_data" IS NULL`
  );
};
