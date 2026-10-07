import { execute, type PoolClient } from '@evershop/postgres-query-builder';

/**
 * Webhook module — initial schema (spec: specifications/webhook.md §5).
 *
 * `webhook_delivery` is both the retry queue and the admin-visible log: a row
 * is written first, then sent, then retried from the row (the original `event`
 * row is long gone by then). Statuses: pending | sending | delivered | failed |
 * canceled.
 */
export default async (connection: PoolClient): Promise<void> => {
  await execute(
    connection,
    `CREATE TABLE "webhook" (
      "webhook_id" INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
      "uuid" UUID NOT NULL DEFAULT gen_random_uuid (),
      "name" varchar NOT NULL,
      "url" text NOT NULL,
      "secret" varchar NOT NULL,
      "topics" jsonb NOT NULL DEFAULT '[]',
      "enabled" boolean NOT NULL DEFAULT true,
      "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "WEBHOOK_UUID_UNIQUE" UNIQUE ("uuid")
    )`
  );

  await execute(
    connection,
    `CREATE TABLE "webhook_delivery" (
      "webhook_delivery_id" INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
      "uuid" UUID NOT NULL DEFAULT gen_random_uuid (),
      "webhook_id" INT NOT NULL,
      "topic" varchar NOT NULL,
      "event_uuid" UUID,
      "payload" jsonb NOT NULL,
      "status" varchar NOT NULL DEFAULT 'pending',
      "attempts" int NOT NULL DEFAULT 0,
      "next_attempt_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "started_at" TIMESTAMP WITH TIME ZONE,
      "completed_at" TIMESTAMP WITH TIME ZONE,
      "last_status_code" int,
      "last_error" varchar,
      "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "WEBHOOK_DELIVERY_UUID_UNIQUE" UNIQUE ("uuid"),
      CONSTRAINT "WEBHOOK_DELIVERY_WEBHOOK_FK" FOREIGN KEY ("webhook_id")
        REFERENCES "webhook" ("webhook_id") ON DELETE CASCADE
    )`
  );

  // The worker's claim: due pending rows.
  await execute(
    connection,
    `CREATE INDEX "WEBHOOK_DELIVERY_DUE_IDX" ON "webhook_delivery" ("status", "next_attempt_at")`
  );
  // The admin list per webhook, newest first.
  await execute(
    connection,
    `CREATE INDEX "WEBHOOK_DELIVERY_LIST_IDX" ON "webhook_delivery" ("webhook_id", "webhook_delivery_id" DESC)`
  );
  // The cached per-webhook backlog count (the subscriber's ceiling check).
  await execute(
    connection,
    `CREATE INDEX "WEBHOOK_DELIVERY_PENDING_IDX" ON "webhook_delivery" ("webhook_id") WHERE "status" = 'pending'`
  );
};
