import { execute } from '@evershop/postgres-query-builder';
import type { PoolClient } from 'pg';

/**
 * Product recommendations (related products + frequently bought together) —
 * schema foundation. See specifications/05-related-products-cross-sell-specification.md § 5.
 *
 * `product_link` holds manually curated product-to-product links. Links are
 * directional (A→B does not imply B→A); `type` accepts 'upsell' purely so a
 * future upsell feature needs no migration (spec § 3). `sort_order` is the
 * pinning order of the manual prefix in the resolution waterfall (§ 6.3).
 *
 * `product_stat` / `product_relation` / `product_stat_meta` are REBUILT
 * WHOLESALE by the nightly recompute job (§ 7.3) — no incremental writes, no
 * data migration here (§ 5.5: backfill is the job's first run, deliberately
 * not done in-migration so upgrades never block on a large order_item table).
 * `product_id` in the stats tables is always a variant-group REPRESENTATIVE
 * (§ 7.2: MIN(product_id) of the group, or the product's own id). CASCADE FKs
 * self-heal on product deletion — the next nightly run re-elects.
 * `product_relation` stores directed rows (both directions), so the composite
 * PK doubles as the per-anchor serving index. Counts only — confidence and
 * lift are DERIVED at read time (§ 5.2 / D2); a stored ratio would be stale
 * after every order.
 *
 * The `product_stat_meta` seed row means "never computed" is a readable state
 * (computed_at NULL) rather than a missing row — the admin status line
 * (§ 10.1) and the lift denominator join (§ 7.4) both rely on the row
 * existing.
 *
 * `product.category_id` got its FK in Version-1.0.2 WITHOUT an index; the
 * same-category rule (§ 6.1) puts that lookup on every PDP, hence
 * PRODUCT_CATEGORY_ID_INDEX here. `variant_group_id` is already covered by
 * "FK_PRODUCT_VARIANT_GROUP" (Version-1.0.0) — do not duplicate it.
 *
 * The mode/rules columns ride the existing product/category PATCH because
 * `given()` keeps real columns (§ 5.3). No `default` keywords exist for them
 * in the AJV schemas on purpose: getAjv() runs useDefaults:'empty', so a
 * schema default would be INJECTED into partial PATCH payloads and silently
 * reset stored modes.
 */
export default async (connection: PoolClient) => {
  await execute(
    connection,
    `CREATE TABLE IF NOT EXISTS "product_link" (
      "product_link_id" INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
      "product_id" INT NOT NULL REFERENCES "product" ("product_id") ON DELETE CASCADE,
      "linked_product_id" INT NOT NULL REFERENCES "product" ("product_id") ON DELETE CASCADE,
      "type" varchar(20) NOT NULL,
      "sort_order" INT NOT NULL DEFAULT 0,
      "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "PRODUCT_LINK_UUID_UNIQUE" UNIQUE ("uuid"),
      CONSTRAINT "PRODUCT_LINK_UNIQUE" UNIQUE ("product_id", "linked_product_id", "type"),
      CONSTRAINT "PRODUCT_LINK_NO_SELF" CHECK ("product_id" <> "linked_product_id"),
      CONSTRAINT "PRODUCT_LINK_TYPE_CHECK" CHECK ("type" IN ('related', 'cross_sell', 'upsell'))
    )`
  );

  await execute(
    connection,
    `CREATE INDEX IF NOT EXISTS "PRODUCT_LINK_PRODUCT_ID"
       ON "product_link" ("product_id", "type", "sort_order")`
  );

  await execute(
    connection,
    `CREATE TABLE IF NOT EXISTS "product_stat" (
      "product_id" INT PRIMARY KEY REFERENCES "product" ("product_id") ON DELETE CASCADE,
      "order_count" INT NOT NULL DEFAULT 0
    )`
  );

  await execute(
    connection,
    `CREATE TABLE IF NOT EXISTS "product_relation" (
      "product_id" INT NOT NULL REFERENCES "product" ("product_id") ON DELETE CASCADE,
      "related_product_id" INT NOT NULL REFERENCES "product" ("product_id") ON DELETE CASCADE,
      "co_purchase_count" INT NOT NULL DEFAULT 0,
      PRIMARY KEY ("product_id", "related_product_id")
    )`
  );

  await execute(
    connection,
    `CREATE TABLE IF NOT EXISTS "product_stat_meta" (
      "id" SMALLINT PRIMARY KEY DEFAULT 1,
      "total_order_count" INT NOT NULL DEFAULT 0,
      "computed_at" TIMESTAMP WITH TIME ZONE,
      CONSTRAINT "PRODUCT_STAT_META_SINGLE_ROW" CHECK ("id" = 1)
    )`
  );

  // "Never computed" is a readable state (computed_at NULL), not a missing row.
  await execute(
    connection,
    `INSERT INTO "product_stat_meta" ("id", "total_order_count", "computed_at")
     VALUES (1, 0, NULL)
     ON CONFLICT ("id") DO NOTHING`
  );

  await execute(
    connection,
    `ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "related_products_mode" varchar(20) NOT NULL DEFAULT 'inherit'
       CONSTRAINT "PRODUCT_RELATED_MODE_CHECK" CHECK ("related_products_mode" IN ('inherit', 'custom', 'manual_only'))`
  );

  await execute(
    connection,
    `ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "related_products_rules" JSONB`
  );

  await execute(
    connection,
    `ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "cross_sell_mode" varchar(20) NOT NULL DEFAULT 'auto'
       CONSTRAINT "PRODUCT_CROSS_SELL_MODE_CHECK" CHECK ("cross_sell_mode" IN ('auto', 'manual_only', 'manual_first'))`
  );

  await execute(
    connection,
    `ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "exclude_from_recommendation" boolean NOT NULL DEFAULT FALSE`
  );

  await execute(
    connection,
    `ALTER TABLE "category" ADD COLUMN IF NOT EXISTS "related_products_rules" JSONB`
  );

  // The category_id FK (Version-1.0.2) shipped without an index; the
  // same-category rule runs this lookup on every PDP. Category pages benefit too.
  // Non-CONCURRENT build: CONCURRENTLY cannot run inside the migration
  // transaction, so product writes block for the build duration during the
  // upgrade window — sub-second for typical catalogs, accepted for very large
  // ones (upgrades are maintenance windows).
  await execute(
    connection,
    `CREATE INDEX IF NOT EXISTS "PRODUCT_CATEGORY_ID_INDEX"
       ON "product" ("category_id")`
  );
};
