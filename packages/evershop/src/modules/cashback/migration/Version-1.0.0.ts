import { execute, type PoolClient } from '@evershop/postgres-query-builder';

export default async (connection: PoolClient) => {
  // Create customer_balance table
  await execute(
    connection,
    `CREATE TABLE IF NOT EXISTS "customer_balance" (
      "customer_balance_id" INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      "uuid" UUID NOT NULL DEFAULT gen_random_uuid (),
      "customer_id" INT NOT NULL UNIQUE,
      "balance" DECIMAL(12, 4) NOT NULL DEFAULT 0.0000,
      "pending_balance" DECIMAL(12, 4) NOT NULL DEFAULT 0.0000,
      "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "FK_CUSTOMER_BALANCE_CUSTOMER" FOREIGN KEY ("customer_id") REFERENCES "customer" ("customer_id") ON DELETE CASCADE
    )`
  );

  await execute(
    connection,
    `CREATE INDEX IF NOT EXISTS "FK_CUSTOMER_BALANCE_CUSTOMER" ON "customer_balance" ("customer_id")`
  );

  // Create cashback_transaction table
  await execute(
    connection,
    `CREATE TABLE IF NOT EXISTS "cashback_transaction" (
      "cashback_transaction_id" INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      "uuid" UUID NOT NULL DEFAULT gen_random_uuid (),
      "customer_id" INT NOT NULL,
      "order_id" INT DEFAULT NULL,
      "amount" DECIMAL(12, 4) NOT NULL,
      "type" VARCHAR(32) NOT NULL, -- 'earned', 'redeemed', 'refunded', 'manual_adjustment'
      "status" VARCHAR(32) NOT NULL DEFAULT 'available', -- 'pending', 'available', 'cancelled'
      "note" TEXT DEFAULT NULL,
      "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "FK_CASHBACK_TRANSACTION_CUSTOMER" FOREIGN KEY ("customer_id") REFERENCES "customer" ("customer_id") ON DELETE CASCADE
    )`
  );

  await execute(
    connection,
    `CREATE INDEX IF NOT EXISTS "FK_CASHBACK_TRANSACTION_CUSTOMER" ON "cashback_transaction" ("customer_id")`
  );

  // Default cashback settings
  await execute(
    connection,
    `INSERT INTO "setting" ("name", "value", "is_json")
     VALUES ('cashback_enabled', '1', 0)
     ON CONFLICT ("name") DO NOTHING`
  );

  await execute(
    connection,
    `INSERT INTO "setting" ("name", "value", "is_json")
     VALUES ('cashback_percentage', '5', 0)
     ON CONFLICT ("name") DO NOTHING`
  );

  await execute(
    connection,
    `INSERT INTO "setting" ("name", "value", "is_json")
     VALUES ('cashback_min_order_amount', '0', 0)
     ON CONFLICT ("name") DO NOTHING`
  );
};
