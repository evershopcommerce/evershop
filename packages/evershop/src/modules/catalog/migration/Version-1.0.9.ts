import { execute } from '@evershop/postgres-query-builder';
import type { PoolClient } from 'pg';

/**
 * Package management (parcel sizing) — schema, part 1 of 3.
 * See wiki/package-management-design.md.
 *
 * Creates the `package` table (admin-managed box/envelope sizes) and the
 * `product.package_id` reference. Both live in THIS catalog migration on
 * purpose: the FK must never depend on cross-module migration ordering.
 *
 * Units: `length`/`width`/`height` are stored in the store's dimension unit
 * (`shop.dimensionUnit`, default 'cm'); the tare `weight` (the EMPTY
 * package's own weight, added to shipping weight for quotes and labels) is
 * stored in the store's weight unit (`shop.weightUnit`). No per-row unit
 * columns — same model and same unit-change caveat as `product.weight`.
 *
 * `height >= 0` (not > 0): a flat envelope is height 0.
 *
 * The partial unique index makes "at most one default" a database guarantee —
 * the service-level default swap can race, the index cannot.
 *
 * Seed row: product creation makes the package selector mandatory for
 * shippable products and preselects the default; without a seed, a fresh
 * install dead-ends ("no packages exist"). Merchants rename/edit it.
 *
 * `product.package_id` is NULLABLE on purpose — legacy products keep NULL
 * until next edited; mandatory-ness is application-level and applies to
 * shippable products only. ON DELETE RESTRICT: a package referenced by
 * products cannot be deleted (the service reports the count).
 */
export default async (connection: PoolClient) => {
  await execute(
    connection,
    `CREATE TABLE IF NOT EXISTS "package" (
      "package_id" INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
      "name" varchar NOT NULL,
      "length" decimal(12,2) NOT NULL,
      "width" decimal(12,2) NOT NULL,
      "height" decimal(12,2) NOT NULL,
      "weight" decimal(12,4) NOT NULL DEFAULT 0,
      "is_default" boolean NOT NULL DEFAULT FALSE,
      "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "PACKAGE_UUID_UNIQUE" UNIQUE ("uuid"),
      CONSTRAINT "PACKAGE_NAME_UNIQUE" UNIQUE ("name"),
      CONSTRAINT "PACKAGE_LENGTH_POSITIVE" CHECK ("length" > 0),
      CONSTRAINT "PACKAGE_WIDTH_POSITIVE" CHECK ("width" > 0),
      CONSTRAINT "PACKAGE_HEIGHT_NON_NEGATIVE" CHECK ("height" >= 0),
      CONSTRAINT "PACKAGE_WEIGHT_NON_NEGATIVE" CHECK ("weight" >= 0)
    )`
  );

  // At most one default — enforced by the DB, not just the service layer.
  await execute(
    connection,
    `CREATE UNIQUE INDEX IF NOT EXISTS "ONLY_ONE_DEFAULT_PACKAGE"
       ON "package" ("is_default") WHERE "is_default" = TRUE`
  );

  // Starter package so product creation never dead-ends on a fresh install.
  await execute(
    connection,
    `INSERT INTO "package" ("name", "length", "width", "height", "weight", "is_default")
     VALUES ('Standard Box', 30, 25, 10, 0, TRUE)
     ON CONFLICT ("name") DO NOTHING`
  );

  await execute(
    connection,
    `ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "package_id" INT
       REFERENCES "package" ("package_id") ON DELETE RESTRICT`
  );
};
