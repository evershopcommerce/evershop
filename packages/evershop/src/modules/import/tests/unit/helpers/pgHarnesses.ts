import { createHash } from 'crypto';
import { PgFileStore } from '../../../adapters/PgFileStore.js';
import { PgJobAdmin } from '../../../adapters/PgJobAdmin.js';
import { PgJobMaintenance } from '../../../adapters/PgJobMaintenance.js';
import { PgJobRepository } from '../../../adapters/PgJobRepository.js';
import { PgLookup } from '../../../adapters/PgLookup.js';
import { RETENTION_MS } from '../../../services/job/transitions.js';
import type { ImportJob, StoredIssue } from '../../../services/job/types.js';
import type { StoreFixture } from '../../../services/ports/lookup.js';
import type { ImportEntity } from '../../../services/types.js';
import type { FileStoreHarness } from './fileStoreContract.js';
import type { JobAdminHarness } from './jobAdminContract.js';
import type { JobMaintenanceHarness } from './jobMaintenanceContract.js';
import type { JobRepoHarness } from './jobRepositoryContract.js';
import type { LookupHarness } from './lookupContract.js';
import type { ScratchDb } from './scratchDb.js';

const date = (ms: number | null | undefined) =>
  ms === null || ms === undefined ? null : new Date(ms);

/** Starts each test from no jobs. Always the tables of the test schema. */
async function emptyJobs(db: ScratchDb): Promise<void> {
  await db.pool.query(
    `TRUNCATE "${db.schema}".import_job RESTART IDENTITY CASCADE`
  );
}

/** `PgJobRepository` on the scratch database, as a harness for the contract. */
export async function pgJobHarness(
  db: ScratchDb,
  repo = new PgJobRepository(db.pool)
): Promise<JobRepoHarness> {
  const { pool } = db;
  await emptyJobs(db);
  return {
    repo,
    async insert(fields: Partial<ImportJob> = {}) {
      const result = await pool.query(
        `INSERT INTO "${db.schema}".import_job
           (entity, mode, status, stage, control, file_name, file_size,
            chunk_count, file_sha256, options, counts, error_message, attempt,
            worker, started_at, finished_at, heartbeat_at, expires_at,
            created_at, status_changed_at, waiting_since)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb,
                 COALESCE($11::jsonb, '{}'::jsonb), $12, $13, $14, $15, $16, $17, $18,
                 COALESCE($19, now()), COALESCE($20, now()), $21)
         RETURNING import_job_id`,
        [
          fields.entity ?? 'category',
          fields.mode ?? 'upsert',
          fields.status ?? 'uploaded',
          fields.stage ?? null,
          fields.control ?? null,
          fields.fileName ?? 'categories.csv',
          fields.fileSize ?? 0,
          fields.chunkCount ?? null,
          fields.fileSha256 ?? null,
          JSON.stringify(fields.options ?? {}),
          fields.counts ? JSON.stringify(fields.counts) : null,
          fields.errorMessage ?? null,
          fields.attempt ?? 0,
          fields.worker ?? null,
          date(fields.startedAt),
          date(fields.finishedAt),
          date(fields.heartbeatAt),
          date(fields.expiresAt),
          date(fields.createdAt),
          date(fields.statusChangedAt),
          date(fields.waitingSince)
        ]
      );
      return (await repo.get(result.rows[0].import_job_id)) as ImportJob;
    },
    async snapshot(jobId) {
      const job = await repo.get(jobId);
      if (!job) throw new Error(`No job ${jobId}`);
      return job;
    },
    async issues(jobId, phase) {
      const result = await pool.query(
        `SELECT phase, row_number, entity_key, column_name, code, params,
                severity, message, value
           FROM "${db.schema}".import_job_issue
          WHERE import_job_id = $1 AND ($2::text IS NULL OR phase = $2)
          ORDER BY import_job_issue_id`,
        [jobId, phase ?? null]
      );
      return result.rows.map(
        (row): StoredIssue => ({
          phase: row.phase,
          rowNumber: row.row_number,
          entityKey: row.entity_key,
          column: row.column_name,
          code: row.code,
          severity: row.severity,
          params: row.params,
          message: row.message,
          value: row.value
        })
      );
    },
    async seedIssues(jobId, issues) {
      for (const issue of issues) {
        // eslint-disable-next-line no-await-in-loop
        await pool.query(
          `INSERT INTO "${db.schema}".import_job_issue
             (import_job_id, phase, row_number, entity_key, column_name, code,
              params, severity, message, value)
           VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10)`,
          [
            jobId,
            issue.phase,
            issue.rowNumber,
            issue.entityKey,
            issue.column,
            issue.code,
            JSON.stringify(issue.params),
            issue.severity,
            issue.message,
            issue.value
          ]
        );
      }
    },
    async setControl(jobId, control) {
      await pool.query(
        `UPDATE "${db.schema}".import_job SET control = $2 WHERE import_job_id = $1`,
        [jobId, control]
      );
    },
    async setStatus(jobId, status) {
      await pool.query(
        `UPDATE "${db.schema}".import_job SET status = $2 WHERE import_job_id = $1`,
        [jobId, status]
      );
    },
    async delete(jobId) {
      await pool.query(
        `DELETE FROM "${db.schema}".import_job WHERE import_job_id = $1`,
        [jobId]
      );
    },
    now: () => Date.now(),
    advance: (ms) =>
      new Promise((resolve) => {
        setTimeout(resolve, Math.min(ms, 20));
      }),
    retentionMs: RETENTION_MS
  };
}

/** `PgJobAdmin` (and `PgJobRepository`) on the scratch database, as a harness for the contracts. */
export async function pgAdminHarness(
  db: ScratchDb,
  admin = new PgJobAdmin(db.pool)
): Promise<JobAdminHarness> {
  const base = await pgJobHarness(db);
  const { pool } = db;
  return {
    ...base,
    admin,
    async chunksOf(jobId) {
      const result = await pool.query(
        `SELECT data FROM "${db.schema}".import_job_file
          WHERE import_job_id = $1 ORDER BY seq`,
        [jobId]
      );
      return result.rows.map((row) => row.data as Buffer);
    },
    async seedChunks(jobId, chunks) {
      for (const [seq, data] of chunks.entries()) {
        // eslint-disable-next-line no-await-in-loop
        await pool.query(
          `INSERT INTO "${db.schema}".import_job_file (import_job_id, seq, data)
           VALUES ($1, $2, $3)`,
          [jobId, seq, data]
        );
      }
    }
  };
}

/** `PgJobMaintenance` (with the admin and the repository) on the scratch database. */
export async function pgMaintenanceHarness(
  db: ScratchDb,
  maintenance = new PgJobMaintenance(db.pool)
): Promise<JobMaintenanceHarness> {
  return { ...(await pgAdminHarness(db)), maintenance };
}

/** `PgFileStore` on the scratch database, as a harness for the contract. */
export async function pgFileHarness(db: ScratchDb): Promise<FileStoreHarness> {
  const { pool } = db;
  const schema = `"${db.schema}"`;
  await emptyJobs(db);
  const newJob = async (status = 'completed') =>
    (
      await pool.query(
        `INSERT INTO ${schema}.import_job (entity, status, file_name)
         VALUES ('category', $1, 'categories.csv') RETURNING import_job_id`,
        [status]
      )
    ).rows[0].import_job_id as number;
  const chunkCountOf = async (jobId: number) =>
    (
      await pool.query(
        `SELECT chunk_count FROM ${schema}.import_job WHERE import_job_id = $1`,
        [jobId]
      )
    ).rows[0].chunk_count as number;
  return {
    store: new PgFileStore(pool),
    missingJob: 987_654_321,
    async stage(content, chunkSize = 1_048_576) {
      const bytes =
        typeof content === 'string' ? Buffer.from(content) : content;
      const jobId = await newJob();
      let count = 0;
      for (let at = 0; at < bytes.length; at += chunkSize) {
        // eslint-disable-next-line no-await-in-loop
        await pool.query(
          `INSERT INTO ${schema}.import_job_file (import_job_id, seq, data) VALUES ($1, $2, $3)`,
          [jobId, count, bytes.subarray(at, at + chunkSize)]
        );
        count += 1;
      }
      await pool.query(
        `UPDATE ${schema}.import_job
            SET file_size = $2, chunk_count = $3, file_sha256 = $4
          WHERE import_job_id = $1`,
        [
          jobId,
          bytes.length,
          count,
          createHash('sha256').update(bytes).digest('hex')
        ]
      );
      return jobId;
    },
    async stageIncomplete() {
      const jobId = await newJob('uploading');
      await pool.query(
        `INSERT INTO ${schema}.import_job_file (import_job_id, seq, data) VALUES ($1, 0, $2)`,
        [jobId, Buffer.from('a,b\n')]
      );
      return jobId;
    },
    async damage(jobId, how) {
      const count = await chunkCountOf(jobId);
      const chunk = (seq: number) =>
        pool.query(
          `DELETE FROM ${schema}.import_job_file WHERE import_job_id = $1 AND seq = $2`,
          [jobId, seq]
        );
      const job = (set: string) =>
        pool.query(
          `UPDATE ${schema}.import_job SET ${set} WHERE import_job_id = $1`,
          [jobId]
        );
      switch (how) {
        case 'drop-first-chunk':
          await chunk(0);
          break;
        case 'drop-middle-chunk':
          await chunk(Math.floor(count / 2));
          break;
        case 'drop-last-chunk':
          await chunk(count - 1);
          break;
        case 'extra-chunk':
          await pool.query(
            `INSERT INTO ${schema}.import_job_file (import_job_id, seq, data) VALUES ($1, $2, $3)`,
            [jobId, count, Buffer.from('x')]
          );
          break;
        case 'flip-byte':
          await pool.query(
            `UPDATE ${schema}.import_job_file
                SET data = set_byte(data, 0, get_byte(data, 0) # 255)
              WHERE import_job_id = $1 AND seq = 0`,
            [jobId]
          );
          break;
        case 'wrong-size':
          await job('file_size = file_size + 1');
          break;
        case 'wrong-sha256':
          await job(`file_sha256 = repeat('f', 64)`);
          break;
        default:
          await job('chunk_count = chunk_count + 1');
      }
    }
  };
}

const OWNER_TYPE: Record<ImportEntity, string> = {
  category: 'category',
  product: 'product',
  customer: 'customer',
  customerAddress: 'customer_address'
};

/** `PgLookup` on the scratch database, as a harness for the contract. */
export async function pgLookupHarness(db: ScratchDb): Promise<LookupHarness> {
  const { pool } = db;
  const schema = `"${db.schema}"`;
  const sources = { routes: [] as string[], languages: [] as string[] };
  const lookup = new PgLookup(pool, {
    routePaths: () => sources.routes,
    enabledLanguages: async () => sources.languages
  });
  const harness: LookupHarness = {
    lookup,
    async set(fixture: StoreFixture) {
      await pool.query(
        `TRUNCATE ${schema}.category, ${schema}.category_description,
                  ${schema}.metafield_definition RESTART IDENTITY`
      );
      // Parents first, as the foreign key of a real store needs.
      const ids = new Map<string, number>();
      const pending = [...(fixture.categories ?? [])];
      while (pending.length > 0) {
        const at = pending.findIndex(
          (c) => !c.parentUrlKey || ids.has(c.parentUrlKey)
        );
        if (at === -1) throw new Error('A fixture category has no parent');
        const [category] = pending.splice(at, 1);
        // eslint-disable-next-line no-await-in-loop
        const inserted = await pool.query(
          `INSERT INTO ${schema}.category (status, parent_id)
           VALUES ($1, $2) RETURNING category_id`,
          [
            (category.status ?? 1) === 1,
            category.parentUrlKey ? ids.get(category.parentUrlKey) : null
          ]
        );
        const id = inserted.rows[0].category_id as number;
        ids.set(category.urlKey, id);
        // eslint-disable-next-line no-await-in-loop
        await pool.query(
          `INSERT INTO ${schema}.category_description
             (category_description_category_id, name, url_key)
           VALUES ($1, $2, $3)`,
          [id, category.name ?? category.urlKey, category.urlKey]
        );
      }
      for (const [entity, keys] of Object.entries(fixture.metafields ?? {})) {
        for (const full of keys ?? []) {
          const [namespace, key] = full.split('.');
          // eslint-disable-next-line no-await-in-loop
          await pool.query(
            `INSERT INTO ${schema}.metafield_definition
               (owner_type, namespace, field_key, name, field_type)
             VALUES ($1, $2, $3, $4, 'short_text')`,
            [OWNER_TYPE[entity as ImportEntity], namespace, key, full]
          );
        }
      }
      // Half of the reserved keys are routes, half are language codes.
      const reserved = fixture.reservedUrlKeys ?? [];
      sources.routes = reserved
        .filter((_, n) => n % 2 === 0)
        .map((key) => `/${key}`);
      sources.languages = reserved.filter((_, n) => n % 2 === 1);
    }
  };
  return harness;
}
