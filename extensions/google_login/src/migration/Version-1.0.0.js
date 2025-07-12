import { execute } from "@evershop/postgres-query-builder";

export default async (connection) => {
  // Add a column named `is_google_login` to `customer` table, after `password` column
  await execute(
    connection,
    `ALTER TABLE "customer" ADD COLUMN "is_google_login" boolean NOT NULL DEFAULT FALSE`
  );
};
