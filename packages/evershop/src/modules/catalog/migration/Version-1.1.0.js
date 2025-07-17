const { execute } = require('@evershop/postgres-query-builder');

// eslint-disable-next-line no-multi-assign
module.exports = exports = async (connection) => {
  // rename the image column in the product_image table to origin_image
  await execute(
    connection,
    `CREATE TABLE IF NOT EXISTS "account" (
      "account_id" INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
      "product_id" INT NOT NULL,
      "username" VARCHAR DEFAULT NULL,
      "password" VARCHAR DEFAULT NULL,
      "access_detail" TEXT DEFAULT NULL,
      "key" VARCHAR DEFAULT NULL,
      "status" VARCHAR NOT NULL,
      "client_email" VARCHAR DEFAULT NULL,
      "expiration_date" DATE DEFAULT NULL,
      "sold_at" TIMESTAMP DEFAULT NULL,
      CONSTRAINT "FK_PRODUCT_ACCOUNT" FOREIGN KEY ("product_id") REFERENCES "product" ("product_id") ON DELETE CASCADE
    )`
  );
};