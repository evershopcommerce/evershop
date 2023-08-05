const { execute } = require('@evershop/postgres-query-builder');

// eslint-disable-next-line no-multi-assign
module.exports = exports = async (connection) => {
  await execute(
    connection,
    `CREATE TABLE "product_review" (
  "review_id" INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
  "uuid" UUID NOT NULL DEFAULT gen_random_uuid (),
  "product_id" INT NOT NULL,
  "customer_name" varchar NOT NULL,
  "rating" INT NOT NULL,
  "comment" varchar DEFAULT NULL,
  "approved" BOOLEAN DEFAULT FALSE,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FK_PRODUCT_REVIEW" FOREIGN KEY ("product_id") REFERENCES "product" ("product_id") ON DELETE CASCADE
)
`
  );
};
