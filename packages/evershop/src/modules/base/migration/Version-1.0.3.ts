import { execute, type PoolClient } from '@evershop/postgres-query-builder';

export default async (connection: PoolClient) => {
  // Closed, core-defined set of field types.
  await execute(
    connection,
    `CREATE TYPE metafield_type AS ENUM (
      'short_text', 'long_text', 'rich_text', 'integer', 'number', 'boolean',
      'date', 'color', 'url', 'money', 'json', 'reference', 'group'
    )`
  );

  // The typed, reusable field declaration. owner_type / reference_type are open
  // (plain varchar) so any entity — core or third-party — can opt in without the
  // core enumerating it.
  await execute(
    connection,
    `CREATE TABLE "metafield_definition" (
      "metafield_definition_id" INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
      "uuid" UUID NOT NULL DEFAULT gen_random_uuid (),
      "owner_type" varchar(64) NOT NULL,
      "namespace" varchar(64) NOT NULL DEFAULT 'custom',
      "field_key" varchar(64) NOT NULL,
      "name" varchar(255) NOT NULL,
      "description" text,
      "field_type" metafield_type NOT NULL,
      "reference_type" varchar(64),
      "is_list" boolean NOT NULL DEFAULT false,
      "required" boolean NOT NULL DEFAULT false,
      "translatable" boolean NOT NULL DEFAULT false,
      "visible_to_customer" boolean NOT NULL DEFAULT true,
      "sub_fields" jsonb NOT NULL DEFAULT '[]',
      "validations" jsonb NOT NULL DEFAULT '[]',
      "appearance" jsonb NOT NULL DEFAULT '{}',
      "position" integer NOT NULL DEFAULT 0,
      "created_at" timestamptz NOT NULL DEFAULT now(),
      "updated_at" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "METAFIELD_DEFINITION_UUID_UNIQUE" UNIQUE ("uuid"),
      CONSTRAINT "METAFIELD_DEFINITION_KEY_UNIQUE" UNIQUE ("owner_type", "namespace", "field_key"),
      CONSTRAINT "METAFIELD_REFERENCE_TYPE_IFF_REFERENCE" CHECK (("field_type" = 'reference') = ("reference_type" IS NOT NULL)),
      CONSTRAINT "METAFIELD_SUB_FIELDS_IFF_GROUP" CHECK (("field_type" = 'group') = (jsonb_array_length("sub_fields") > 0))
    )`
  );

  await execute(
    connection,
    `CREATE INDEX "METAFIELD_DEFINITION_OWNER_IDX" ON "metafield_definition" ("owner_type")`
  );

  // The 'shop' (global / standalone) owner has no entity table; its single
  // meta_data blob lives in this one-row singleton (id is always true).
  await execute(
    connection,
    `CREATE TABLE "metafield_shop" (
      "id" boolean PRIMARY KEY DEFAULT true,
      "meta_data" jsonb NOT NULL DEFAULT '{}',
      CONSTRAINT "METAFIELD_SHOP_SINGLETON" CHECK ("id")
    )`
  );

  await execute(
    connection,
    `INSERT INTO "metafield_shop" ("id") VALUES (true) ON CONFLICT DO NOTHING`
  );
};
