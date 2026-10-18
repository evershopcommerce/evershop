import { pool } from '../../../lib/postgres/connection.js';
import { CoreJobRequests } from '../adapters/CoreJobRequests.js';
import { coreLogger } from '../adapters/coreLogger.js';
import {
  fileLimits,
  maxFileBytes,
  retentionMs
} from '../adapters/importConfig.js';
import { nodeSha256 } from '../adapters/nodeSha256.js';
import { PgFileStore } from '../adapters/PgFileStore.js';
import { PgJobAdmin } from '../adapters/PgJobAdmin.js';
import { PgJobRepository } from '../adapters/PgJobRepository.js';
import { ImportService } from '../services/jobs/ImportService.js';
import type { ImportWeb } from './ImportWeb.js';

let cached: ImportWeb | null = null;

/**
 * The real `ImportWeb`, built once from core's pool and configuration. The
 * handlers in `api/` get it here; the tests of the handlers pass their own.
 */
export function importWeb(): ImportWeb {
  if (cached) return cached;
  const repository = new PgJobRepository(pool, { retentionMs: retentionMs() });
  cached = {
    service: new ImportService({
      jobs: new PgJobAdmin(pool, { retentionMs: retentionMs() }),
      sha256: nodeSha256,
      maxFileBytes: maxFileBytes(),
      requests: new CoreJobRequests(pool, coreLogger)
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
      maxRows: fileLimits().maxRows,
      maxCellLength: fileLimits().maxCellLength
    },
    logger: coreLogger
  };
  return cached;
}
