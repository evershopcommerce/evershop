const { execute } = require('@evershop/postgres-query-builder');

// eslint-disable-next-line no-multi-assign
module.exports = exports = async (connection) => {
  await execute(
    connection,
    `CREATE TABLE "customer_group" (
  "customer_group_id" INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
  "uuid" UUID NOT NULL DEFAULT gen_random_uuid (),
  "group_name" varchar NOT NULL,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
)`
  );

  // Add default customer group
  await execute(
    connection,
    "INSERT INTO customer_group ( group_name ) VALUES ('Default')"
  );

  await execute(
    connection,
    `CREATE TABLE "customer" (
  "customer_id" INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
  "uuid" UUID NOT NULL DEFAULT gen_random_uuid (),
  "status" smallint NOT NULL DEFAULT 1,
  "group_id" INT DEFAULT 1,
  "email" varchar NOT NULL,
  "password" varchar NOT NULL,
  "full_name" varchar DEFAULT NULL,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EMAIL_UNIQUE" UNIQUE ("email"),
  CONSTRAINT "CUSTOMER_UUID_UNIQUE" UNIQUE ("uuid"),
  CONSTRAINT "FK_CUSTOMER_GROUP" FOREIGN KEY ("group_id") REFERENCES "customer_group" ("customer_group_id") ON DELETE SET NULL
)`
  );
  await execute(
    connection,
    `CREATE INDEX "FK_CUSTOMER_GROUP" ON "customer" ("group_id")`
  );

  await execute(
    connection,
    `CREATE TABLE "customer_address" (
  "customer_address_id" INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
  "uuid" UUID NOT NULL DEFAULT gen_random_uuid (),
  "customer_id" INT NOT NULL,
  "full_name" varchar DEFAULT NULL,
  "telephone" varchar DEFAULT NULL,
  "address_1" varchar DEFAULT NULL,
  "address_2" varchar DEFAULT NULL,
  "postcode" varchar DEFAULT NULL,
  "city" varchar DEFAULT NULL,
  "province" varchar DEFAULT NULL,
  "country" varchar NOT NULL,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "is_default" smallint DEFAULT NULL,
  CONSTRAINT "CUSTOMER_ADDRESS_UUID_UNIQUE" UNIQUE ("uuid"),
  CONSTRAINT "FK_CUSTOMER_ADDRESS" FOREIGN KEY ("customer_id") REFERENCES "customer" ("customer_id") ON DELETE CASCADE
)`
  );
  await execute(
    connection,
    `CREATE INDEX "FK_CUSTOMER_ADDRESS" ON "customer_address" ("customer_id")`
  );

  // Prevent deleting a default customer group
  await execute(
    connection,
    `CREATE OR REPLACE FUNCTION prevent_delete_default_customer_group()
        RETURNS TRIGGER
        LANGUAGE PLPGSQL
        AS
      $$
      BEGIN
        IF OLD.customer_group_id = 1 THEN
          RAISE EXCEPTION 'Cannot delete default customer group';
        END IF;
        RETURN OLD;
      END;
      $$`
  );
  await execute(
    connection,
    `CREATE TRIGGER "PREVENT_DELETING_THE_DEFAULT_CUSTOMER_GROUP"
        BEFORE DELETE ON customer_group
        FOR EACH ROW
        EXECUTE PROCEDURE prevent_delete_default_customer_group();`
  );

  // Create trigger before insert customer, set default group_id to 1
  await execute(
    connection,
    `CREATE OR REPLACE FUNCTION set_default_customer_group()
        RETURNS TRIGGER
        LANGUAGE PLPGSQL
        AS
      $$
      BEGIN
        IF NEW.group_id IS NULL THEN
          NEW.group_id = 1;
        END IF;
        RETURN NEW;
      END;
      $$`
  );
  await execute(
    connection,
    `CREATE TRIGGER "SET_DEFAULT_CUSTOMER_GROUP"
        BEFORE INSERT ON customer
        FOR EACH ROW
        EXECUTE PROCEDURE set_default_customer_group();`
  );
};
