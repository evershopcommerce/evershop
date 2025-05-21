import { execute } from '@evershop/postgres-query-builder';

export default async (connection) => {
  await execute(
    connection,
    `CREATE TABLE "widget" (
    "widget_id" INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
    "uuid" UUID NOT NULL DEFAULT gen_random_uuid (),
    "name" varchar NOT NULL,
    "type" varchar NOT NULL,
    "route" jsonb NOT NULL default '[]'::jsonb,
    "area" jsonb NOT NULL default '[]'::jsonb,
    "sort_order" INT NOT NULL DEFAULT 1,
    "settings" jsonb NOT NULL default '{}'::jsonb,
    "status" boolean DEFAULT NULL,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WIDGET_UUID" UNIQUE ("uuid")
)`
  );
};
