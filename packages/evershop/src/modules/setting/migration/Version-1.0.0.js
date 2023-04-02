const { execute } = require('@evershop/postgres-query-builder');

// eslint-disable-next-line no-multi-assign
module.exports = exports = async (connection) => {
  await execute(
    connection,
    `CREATE TABLE "setting" (
  "setting_id" INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
  "uuid" UUID NOT NULL DEFAULT gen_random_uuid (),
  "name" varchar NOT NULL,
  "value" text DEFAULT NULL,
  "is_json" boolean NOT NULL DEFAULT FALSE,
  CONSTRAINT "SETTING_UUID_UNIQUE" UNIQUE ("uuid"),
  CONSTRAINT "SETTING_NAME_UNIQUE" UNIQUE ("name")
)`
  );
};
