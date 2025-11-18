import { execute } from '@evershop/postgres-query-builder';

export default async (connection) => {
  await execute(
    connection,
    `CREATE TABLE "shipping_zone" (
  "shipping_zone_id" INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
  "uuid" UUID NOT NULL DEFAULT gen_random_uuid (),
  "name" varchar NOT NULL,
  "country" varchar NOT NULL,
  CONSTRAINT "SHIPPING_ZONE_UUID_UNIQUE" UNIQUE ("uuid")
)
`
  );

  // Add foreign key from table cart (shipping_zone_id) to table shipping_zone (shipping_zone_id)
  await execute(
    connection,
    `ALTER TABLE "cart" ADD CONSTRAINT "FK_CART_SHIPPING_ZONE" FOREIGN KEY ("shipping_zone_id") REFERENCES "shipping_zone" ("shipping_zone_id") ON DELETE SET NULL`
  );
  await execute(
    connection,
    `CREATE INDEX "FK_CART_SHIPPING_ZONE" ON "cart" ("shipping_zone_id")`
  );

  await execute(
    connection,
    `CREATE TABLE "shipping_zone_province" (
  "shipping_zone_province_id" INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
  "uuid" UUID NOT NULL DEFAULT gen_random_uuid (),
  "zone_id" INT NOT NULL,
  "province" varchar NOT NULL,
  CONSTRAINT "SHIPPING_ZONE_PROVINCE_UUID_UNIQUE" UNIQUE ("uuid"),
  CONSTRAINT "SHIPPING_ZONE_PROVINCE_PROVINCE_UNIQUE" UNIQUE ("province"),
  CONSTRAINT "FK_SHIPPING_ZONE_PROVINCE" FOREIGN KEY ("zone_id") REFERENCES "shipping_zone" ("shipping_zone_id") ON DELETE CASCADE
)
`
  );

  await execute(
    connection,
    `CREATE INDEX "FK_SHIPPING_ZONE_PROVINCE" ON "shipping_zone_province" ("zone_id")`
  );

  await execute(
    connection,
    `CREATE TABLE "shipping_method" (
  "shipping_method_id" INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
  "uuid" UUID NOT NULL DEFAULT gen_random_uuid (),
  "name" varchar NOT NULL,
  CONSTRAINT "SHIPPING_METHOD_UUID_UNIQUE" UNIQUE ("uuid"),
  CONSTRAINT "SHIPPING_METHOD_NAME_UNIQUE" UNIQUE ("name")
)
`
  );

  await execute(
    connection,
    `CREATE TABLE "shipping_zone_method" (
  "shipping_zone_method_id" INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
  "method_id" INT NOT NULL,
  "zone_id" INT NOT NULL,
  "is_enabled" boolean NOT NULL DEFAULT TRUE,
  "cost" decimal(12,4) DEFAULT NULL,
  "calculate_api" varchar DEFAULT NULL,
  "condition_type" varchar DEFAULT NULL,
  "max" decimal(12,4) DEFAULT NULL,
  "min" decimal(12,4) DEFAULT NULL,
  CONSTRAINT "METHOD_ZONE_UNIQUE" UNIQUE ("zone_id", "method_id"),
  CONSTRAINT "CONDITION_TYPE_MUST_BE_PRICE_OR_WEIGHT" CHECK (condition_type IS NULL OR condition_type IN ('price', 'weight')),
  CONSTRAINT "CALCULATE API MUST BE PROVIDE IF COST IS NULL" CHECK (cost IS NOT NULL OR calculate_api IS NOT NULL),
  CONSTRAINT "FK_ZONE_METHOD" FOREIGN KEY ("zone_id") REFERENCES "shipping_zone" ("shipping_zone_id") ON DELETE CASCADE,
  CONSTRAINT "FK_METHOD_ZONE" FOREIGN KEY ("method_id") REFERENCES "shipping_method" ("shipping_method_id") ON DELETE CASCADE
)
`
  );

  await execute(
    connection,
    `CREATE INDEX "FK_ZONE_METHOD" ON "shipping_zone_method" ("zone_id")`
  );
  await execute(
    connection,
    `CREATE INDEX "FK_METHOD_ZONE" ON "shipping_zone_method" ("method_id")`
  );
};
