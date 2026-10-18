import { error as logError, info, warning } from '../../../lib/log/logger.js';
import { pool } from '../../../lib/postgres/connection.js';
import { getConfig } from '../../../lib/util/getConfig.js';
import { nodeSha256 } from '../adapters/nodeSha256.js';
import { PgFileStore } from '../adapters/PgFileStore.js';
import { PgJobAdmin } from '../adapters/PgJobAdmin.js';
import { PgJobRepository } from '../adapters/PgJobRepository.js';
import { ImportService } from '../services/jobs/ImportService.js';
import type { ImportWeb } from './ImportWeb.js';

/**
 * `system.import.<key>` (§ 8.7). The typed keys are declared in `getConfig.ts`
 * when the module is registered; until then the key is read as a plain path.
 */
function setting(key: string, fallback: number): number {
  const read = getConfig as unknown as (path: string, d?: unknown) => unknown;
  const value = Number(read(`system.import.${key}`, fallback));
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

/** The most bytes an upload may have: `maxFileSizeMb`, 100 by default. */
function maxFileBytes(): number {
  return Math.floor(setting('maxFileSizeMb', 100) * 1_048_576);
}

let cached: ImportWeb | null = null;

/**
 * The real `ImportWeb`, built once from core's pool and configuration. The
 * handlers in `api/` get it here; the tests of the handlers pass their own.
 */
export function importWeb(): ImportWeb {
  if (cached) return cached;
  const retentionMs = setting('retentionDays', 7) * 86_400_000;
  const repository = new PgJobRepository(pool, { retentionMs });
  cached = {
    service: new ImportService({
      jobs: new PgJobAdmin(pool, { retentionMs }),
      sha256: nodeSha256,
      maxFileBytes: maxFileBytes()
    }),
    files: new PgFileStore(pool),
    issuesInRowOrder: (jobId, phase) =>
      repository.issuesInRowOrder(jobId, phase),
    async adminNames(ids) {
      const result = await pool.query(
        'SELECT admin_user_id, full_name FROM admin_user WHERE admin_user_id = ANY($1::int[])',
        [ids]
      );
      return new Map(
        result.rows.map((row) => [row.admin_user_id, row.full_name])
      );
    },
    limits: {
      maxRows: setting('maxRows', 200_000),
      maxCellLength: setting('maxCellLength', 65_536)
    },
    logger: {
      info: (message) => info(message),
      warn: (message) => warning(message),
      error: (message, meta) =>
        logError(new Error(`${message} ${JSON.stringify(meta ?? {})}`))
    }
  };
  return cached;
}
