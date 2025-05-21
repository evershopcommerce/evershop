import { execute, insert } from '@evershop/postgres-query-builder';

export default async (connection) => {
  await execute(
    connection,
    `CREATE TABLE "tax_class" (
  "tax_class_id" INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
  "uuid" UUID NOT NULL DEFAULT gen_random_uuid (),
  "name" varchar NOT NULL,
  CONSTRAINT "TAX_CLASS_UUID_UNIQUE" UNIQUE ("uuid")
)`
  );

  // Create default tax class
  const taxClass = await insert('tax_class')
    .given({
      name: 'Taxable Goods'
    })
    .execute(connection);

  // Add a constraint to product table
  await execute(
    connection,
    `ALTER TABLE "product" ADD CONSTRAINT "FK_TAX_CLASS" FOREIGN KEY ("tax_class") REFERENCES "tax_class" ("tax_class_id") ON DELETE SET NULL`
  );

  // Prevent deleting the default tax class
  await execute(
    connection,
    `CREATE OR REPLACE FUNCTION prevent_delete_default_tax_class()
        RETURNS TRIGGER
        LANGUAGE PLPGSQL
        AS
      $$
      BEGIN
        IF OLD.tax_class_id = 1 THEN
          RAISE EXCEPTION 'Cannot delete default tax class';
        END IF;
        RETURN OLD;
      END;
      $$`
  );
  await execute(
    connection,
    `CREATE TRIGGER "PREVENT_DELETING_THE_DEFAULT_TAX_CLASS"
        BEFORE DELETE ON tax_class
        FOR EACH ROW
        EXECUTE PROCEDURE prevent_delete_default_tax_class();`
  );

  await execute(
    connection,
    `CREATE TABLE "tax_rate" (
  "tax_rate_id" INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
  "uuid" UUID NOT NULL DEFAULT gen_random_uuid (),
  "name" varchar NOT NULL,
  "tax_class_id" INT DEFAULT NULL,
  "country" varchar NOT NULL DEFAULT '*'::character varying,
  "province" varchar NOT NULL DEFAULT '*'::character varying,
  "postcode" varchar NOT NULL DEFAULT '*'::character varying,
  "rate" decimal(12,4) NOT NULL,
  "is_compound" boolean NOT NULL DEFAULT FALSE,
  "priority" INT NOT NULL,
  CONSTRAINT "TAX_RATE_UUID_UNIQUE" UNIQUE ("uuid"),
  CONSTRAINT "TAX_RATE_PRIORITY_UNIQUE" UNIQUE ("priority", "tax_class_id"),
  CONSTRAINT "UNSIGNED_RATE" CHECK(rate >= 0),
  CONSTRAINT "UNSIGNED_PRIORITY" CHECK(priority >= 0),
  CONSTRAINT "FK_TAX_RATE_TAX_CLASS" FOREIGN KEY ("tax_class_id") REFERENCES "tax_class" ("tax_class_id") ON DELETE CASCADE
)`
  );

  // Create default tax rate for tax class
  await insert('tax_rate')
    .given({
      name: 'Tax',
      tax_class_id: taxClass.insertId,
      country: '*',
      province: '*',
      postcode: '*',
      rate: 0,
      is_compound: false,
      priority: 0
    })
    .execute(connection);
};
