import { execute, type PoolClient } from '@evershop/postgres-query-builder';

/**
 * Import module, initial schema (specifications/12-import-engine-specification.md
 * § 8.4).
 *
 * - `import_job`: one row per upload. The status machine, the counts that the
 *   heartbeat rewrites, and the fencing token (`attempt`).
 * - `import_job_file`: the uploaded file, staged in 1 MiB chunks, so that it does
 *   not matter which instance received the upload and which one runs the job.
 * - `import_job_issue`: the problems of the check and of the import.
 *
 * Two partial unique indexes carry the rules that must hold whatever the
 * instance: at most one open job per entity, and at most one import queued or
 * running in the whole store.
 */
export default async (connection: PoolClient): Promise<void> => {
  await execute(
    connection,
    `CREATE TABLE "import_job" (
      "import_job_id" INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
      "uuid" UUID NOT NULL DEFAULT gen_random_uuid (),
      "entity" varchar NOT NULL,
      "mode" varchar NOT NULL DEFAULT 'upsert',
      "status" varchar NOT NULL DEFAULT 'uploading',
      "stage" varchar DEFAULT NULL,
      "control" varchar DEFAULT NULL,
      "file_name" varchar NOT NULL,
      "file_size" bigint NOT NULL DEFAULT 0,
      "chunk_count" INT DEFAULT NULL,
      "file_sha256" char(64) DEFAULT NULL,
      "options" jsonb NOT NULL DEFAULT '{}',
      "counts" jsonb NOT NULL DEFAULT '{}',
      "error_message" text DEFAULT NULL,
      "created_by" INT DEFAULT NULL,
      "worker" varchar DEFAULT NULL,
      "attempt" INT NOT NULL DEFAULT 0,
      "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      "status_changed_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      "validated_at" TIMESTAMP WITH TIME ZONE DEFAULT NULL,
      "started_at" TIMESTAMP WITH TIME ZONE DEFAULT NULL,
      "finished_at" TIMESTAMP WITH TIME ZONE DEFAULT NULL,
      "heartbeat_at" TIMESTAMP WITH TIME ZONE DEFAULT NULL,
      "waiting_since" TIMESTAMP WITH TIME ZONE DEFAULT NULL,
      "expires_at" TIMESTAMP WITH TIME ZONE DEFAULT NULL,
      CONSTRAINT "IMPORT_JOB_UUID_UNIQUE" UNIQUE ("uuid"),
      CONSTRAINT "IMPORT_JOB_ENTITY_CHECK" CHECK ("entity" IN ('category','product','customer','customerAddress')),
      CONSTRAINT "IMPORT_JOB_MODE_CHECK" CHECK ("mode" IN ('upsert','create','update')),
      CONSTRAINT "IMPORT_JOB_STATUS_CHECK" CHECK ("status" IN ('uploading','uploaded','validating','validated','queued','running','completed','failed','stopped','canceled','interrupted')),
      CONSTRAINT "IMPORT_JOB_STAGE_CHECK" CHECK ("stage" IS NULL OR "stage" IN ('reading','rechecking','lookups','images','writing')),
      CONSTRAINT "IMPORT_JOB_CONTROL_CHECK" CHECK ("control" IS NULL OR "control" = 'cancel'),
      CONSTRAINT "FK_IMPORT_JOB_ADMIN_USER" FOREIGN KEY ("created_by") REFERENCES "admin_user" ("admin_user_id") ON DELETE SET NULL
    )`
  );

  // At most ONE open job per entity. 'uploading' is not open: a file that is
  // still arriving does not disturb the job it will replace.
  await execute(
    connection,
    `CREATE UNIQUE INDEX "IMPORT_JOB_ONE_OPEN_PER_ENTITY" ON "import_job" ("entity")
      WHERE "status" IN ('uploaded','validating','validated','queued','running')`
  );

  // At most ONE import accepted or running in the whole store, whatever the
  // entity. 'queued' is included, so a second Start is refused while the first
  // is still waiting for its worker.
  await execute(
    connection,
    `CREATE UNIQUE INDEX "IMPORT_JOB_ONE_IMPORT_AT_A_TIME" ON "import_job" ((true))
      WHERE "status" IN ('queued','running')`
  );

  await execute(
    connection,
    `CREATE INDEX "IDX_IMPORT_JOB_CREATED" ON "import_job" ("created_at" DESC)`
  );

  await execute(
    connection,
    `CREATE TABLE "import_job_file" (
      "import_job_file_id" INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
      "import_job_id" INT NOT NULL,
      "seq" INT NOT NULL,
      "data" bytea NOT NULL,
      CONSTRAINT "IMPORT_JOB_FILE_SEQ_UNIQUE" UNIQUE ("import_job_id", "seq"),
      CONSTRAINT "IMPORT_JOB_FILE_SIZE_CHECK" CHECK (octet_length("data") <= 1048576),
      CONSTRAINT "FK_IMPORT_JOB_FILE_JOB" FOREIGN KEY ("import_job_id") REFERENCES "import_job" ("import_job_id") ON DELETE CASCADE
    )`
  );

  await execute(
    connection,
    `CREATE TABLE "import_job_issue" (
      "import_job_issue_id" INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
      "import_job_id" INT NOT NULL,
      "phase" varchar NOT NULL,
      "row_number" INT DEFAULT NULL,
      "entity_key" varchar DEFAULT NULL,
      "column_name" varchar DEFAULT NULL,
      "code" varchar NOT NULL,
      "params" jsonb NOT NULL DEFAULT '{}',
      "severity" varchar NOT NULL,
      "message" text NOT NULL,
      "value" varchar(200) DEFAULT NULL,
      CONSTRAINT "IMPORT_JOB_ISSUE_PHASE_CHECK" CHECK ("phase" IN ('validate','import')),
      CONSTRAINT "IMPORT_JOB_ISSUE_SEVERITY_CHECK" CHECK ("severity" IN ('error','warning')),
      CONSTRAINT "FK_IMPORT_JOB_ISSUE_JOB" FOREIGN KEY ("import_job_id") REFERENCES "import_job" ("import_job_id") ON DELETE CASCADE
    )`
  );

  await execute(
    connection,
    `CREATE INDEX "IDX_IMPORT_JOB_ISSUE_ROW" ON "import_job_issue" ("import_job_id", "phase", "row_number")`
  );

  await execute(
    connection,
    `CREATE INDEX "IDX_IMPORT_JOB_ISSUE_CODE" ON "import_job_issue" ("import_job_id", "phase", "code")`
  );
};
