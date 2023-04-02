const { execute } = require('@evershop/postgres-query-builder');

// eslint-disable-next-line no-multi-assign
module.exports = exports = async (connection) => {
  await execute(connection, `CREATE TABLE "product_comment" (
  "comment_id" INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
  "product_id" INT NOT NULL,
  "user_name" varchar NOT NULL,
  "comment" varchar DEFAULT NULL,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FK_PRODUCT_COMMENT" FOREIGN KEY ("product_id") REFERENCES "product" ("product_id") ON DELETE CASCADE
)
`);
};
