import { execute } from '@evershop/postgres-query-builder';

export async function createMigrationTable(connection) {
  await execute(
    connection,
    `CREATE TABLE IF NOT EXISTS "migration"  (
        "migration_id" INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
        "module" varchar NOT NULL,
        "version" varchar NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "MODULE_UNIQUE" UNIQUE ("module")
        )`
  );
}
