-- Address Format Registry — OPERATOR rollback for the schema changes of
--   checkout Version-1.0.12.ts, customer Version-1.0.5.ts, tax Version-1.0.1.ts.
--
-- EverShop has no down-migrations. This script is run by an operator, by hand,
-- together with redeploying the previous release, after restoring the normal
-- precaution: a database backup taken before the upgrade. The application
-- never runs it.
--
-- What it does:
--   * renames the address columns back to their pre-1.0.12 names (metadata-only),
--   * drops the seven added columns ONLY when every value in them is NULL
--     (if customers already stored data there, the drop is refused and the
--     columns stay — nothing is destroyed),
--   * renames shipping_zone_region back to shipping_zone_province with the
--     1.0.8 constraint and index names,
--   * renames the tax_rate columns back,
--   * removes the three migration records so a later re-upgrade runs them again.
--
-- Every step is guarded, so the script is idempotent. Run inside one transaction:
--   psql "$DATABASE_URL" --single-transaction -f scripts/address-formats/rollback-schema.sql

CREATE OR REPLACE FUNCTION pg_temp.rename_column_if(tbl text, src text, dst text) RETURNS void AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
              WHERE table_schema = current_schema() AND table_name = tbl AND column_name = src)
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns
              WHERE table_schema = current_schema() AND table_name = tbl AND column_name = dst) THEN
    EXECUTE format('ALTER TABLE %I RENAME COLUMN %I TO %I', tbl, src, dst);
  END IF;
END $$ LANGUAGE plpgsql;

-- Drops a column only when it exists and holds no value at all.
CREATE OR REPLACE FUNCTION pg_temp.drop_column_if_empty(tbl text, col text) RETURNS void AS $$
DECLARE populated bigint;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
              WHERE table_schema = current_schema() AND table_name = tbl AND column_name = col) THEN
    EXECUTE format('SELECT count(*) FROM %I WHERE %I IS NOT NULL', tbl, col) INTO populated;
    IF populated = 0 THEN
      EXECUTE format('ALTER TABLE %I DROP COLUMN %I', tbl, col);
    ELSE
      RAISE NOTICE 'rollback: keeping %.% (% populated rows)', tbl, col, populated;
    END IF;
  END IF;
END $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION pg_temp.rollback_address_table(tbl text) RETURNS void AS $$
BEGIN
  PERFORM pg_temp.rename_column_if(tbl, 'recipient',           'full_name');
  PERFORM pg_temp.rename_column_if(tbl, 'address_line_1',      'address_1');
  PERFORM pg_temp.rename_column_if(tbl, 'address_line_2',      'address_2');
  PERFORM pg_temp.rename_column_if(tbl, 'locality',            'city');
  PERFORM pg_temp.rename_column_if(tbl, 'administrative_area', 'province');
  PERFORM pg_temp.rename_column_if(tbl, 'postal_code',         'postcode');
  PERFORM pg_temp.drop_column_if_empty(tbl, 'organization');
  PERFORM pg_temp.drop_column_if_empty(tbl, 'address_line_3');
  PERFORM pg_temp.drop_column_if_empty(tbl, 'dependent_locality');
  PERFORM pg_temp.drop_column_if_empty(tbl, 'sorting_code');
  PERFORM pg_temp.drop_column_if_empty(tbl, 'given_name');
  PERFORM pg_temp.drop_column_if_empty(tbl, 'family_name');
  PERFORM pg_temp.drop_column_if_empty(tbl, 'extra');
END $$ LANGUAGE plpgsql;

SELECT pg_temp.rollback_address_table('customer_address');
SELECT pg_temp.rollback_address_table('cart_address');
SELECT pg_temp.rollback_address_table('order_address');

-- shipping_zone_region → shipping_zone_province
DO $$
BEGIN
  IF to_regclass('shipping_zone_region') IS NOT NULL AND to_regclass('shipping_zone_province') IS NULL THEN
    ALTER TABLE "shipping_zone_region" RENAME TO "shipping_zone_province";
  END IF;
END $$;
SELECT pg_temp.rename_column_if('shipping_zone_province', 'shipping_zone_region_id', 'shipping_zone_province_id');
SELECT pg_temp.rename_column_if('shipping_zone_province', 'region_key', 'province');
ALTER TABLE IF EXISTS "shipping_zone_province" DROP CONSTRAINT IF EXISTS "SHIPPING_ZONE_REGION_ZONE_COUNTRY_LEVEL_KEY_UNIQUE";
SELECT pg_temp.drop_column_if_empty('shipping_zone_province', 'level');
-- `level` has a NOT NULL default, so it is never empty: drop it explicitly.
ALTER TABLE IF EXISTS "shipping_zone_province" DROP COLUMN IF EXISTS "level";
DO $$
BEGIN
  IF to_regclass('shipping_zone_province') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SHIPPING_ZONE_PROVINCE_ZONE_COUNTRY_PROVINCE_UNIQUE') THEN
    ALTER TABLE "shipping_zone_province"
      ADD CONSTRAINT "SHIPPING_ZONE_PROVINCE_ZONE_COUNTRY_PROVINCE_UNIQUE" UNIQUE ("zone_id", "country", "province");
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SHIPPING_ZONE_REGION_UUID_UNIQUE') THEN
    ALTER TABLE "shipping_zone_province" RENAME CONSTRAINT "SHIPPING_ZONE_REGION_UUID_UNIQUE" TO "SHIPPING_ZONE_PROVINCE_UUID_UNIQUE";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_SHIPPING_ZONE_REGION') THEN
    ALTER TABLE "shipping_zone_province" RENAME CONSTRAINT "FK_SHIPPING_ZONE_REGION" TO "FK_SHIPPING_ZONE_PROVINCE";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'shipping_zone_region_pkey') THEN
    ALTER TABLE "shipping_zone_province" RENAME CONSTRAINT "shipping_zone_region_pkey" TO "shipping_zone_province_pkey";
  END IF;
END $$;
ALTER INDEX IF EXISTS "FK_SHIPPING_ZONE_REGION" RENAME TO "FK_SHIPPING_ZONE_PROVINCE";
ALTER SEQUENCE IF EXISTS "shipping_zone_region_shipping_zone_region_id_seq"
  RENAME TO "shipping_zone_province_shipping_zone_province_id_seq";

-- tax_rate
SELECT pg_temp.rename_column_if('tax_rate', 'administrative_area', 'province');
SELECT pg_temp.rename_column_if('tax_rate', 'postal_code', 'postcode');

-- The `migration` table holds ONE row per module with its current version
-- (UNIQUE("module")). Step each module back to the version before this
-- release so a later upgrade runs the three files again.
UPDATE "migration" SET "version" = '1.0.11', "updated_at" = CURRENT_TIMESTAMP WHERE "module" = 'checkout' AND "version" = '1.0.12';
UPDATE "migration" SET "version" = '1.0.4',  "updated_at" = CURRENT_TIMESTAMP WHERE "module" = 'customer' AND "version" = '1.0.5';
UPDATE "migration" SET "version" = '1.0.0',  "updated_at" = CURRENT_TIMESTAMP WHERE "module" = 'tax'      AND "version" = '1.0.1';
