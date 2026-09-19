import { pool } from '../../../../../lib/postgres/connection.js';
import {
  CollectorStat,
  SitemapChangeFreq,
  SitemapCollector,
  SitemapEntry
} from '../types.js';
import { EntityUrlRow, mapEntityRows } from './mappers.js';

/**
 * Spec for a DB-backed collector over any entity that has `url_rewrite` rows. `table`,
 * `entityType`, `where` and `updatedAtColumn` are TRUSTED CONSTANTS (never user input) —
 * `entityType` is bound as a parameter; the rest are interpolated.
 */
export interface EntityCollectorSpec {
  name: string;
  table: string;
  entityType: string;
  /** SQL boolean expression over the entity alias `e` (e.g. `e.status = 1`). Default: all rows. */
  where?: string;
  /** Timestamp column on the entity for `<lastmod>`. Default `updated_at`; some tables use `created_at`. */
  updatedAtColumn?: string;
  changefreq?: SitemapChangeFreq;
  priority?: number;
}

/**
 * Build a collector that enumerates an entity's live friendly URLs by joining it to
 * `url_rewrite` (design §3.3). `collect()` reads `request_path` + `updated_at`; `getFingerprint()`
 * runs the SAME join/filter as a `count`/`max(updated_at)` so the change signal tracks exactly the
 * collected set.
 */
export function createEntityCollector(spec: EntityCollectorSpec): SitemapCollector {
  const { name, table, entityType, changefreq, priority } = spec;
  const where = spec.where ?? 'true';
  const updatedAt = spec.updatedAtColumn ?? 'updated_at';
  // Shared FROM/JOIN/WHERE. `ur.entity_type` bound as $1; the rest are trusted constants.
  const source = `FROM "${table}" e JOIN url_rewrite ur ON ur.entity_uuid = e.uuid AND ur.entity_type = $1 WHERE ${where}`;

  return {
    name,
    async collect(): Promise<SitemapEntry[]> {
      const result = await pool.query(
        `SELECT ur.request_path AS request_path, e.${updatedAt} AS updated_at ${source}`,
        [entityType]
      );
      return mapEntityRows(result.rows as EntityUrlRow[], { changefreq, priority });
    },
    async getFingerprint(): Promise<CollectorStat> {
      // `paths_hash` hashes the actual request_paths (order-independent), so a URL change that
      // leaves `updated_at` untouched still moves the fingerprint. `md5(string_agg(...))` is null
      // when there are no rows.
      const result = await pool.query(
        `SELECT count(*)::int AS count,
                max(e.${updatedAt}) AS max_updated_at,
                md5(string_agg(ur.request_path, ',' ORDER BY ur.request_path)) AS paths_hash
         ${source}`,
        [entityType]
      );
      const row = (result.rows[0] as {
        count: number;
        max_updated_at: unknown;
        paths_hash: string | null;
      }) ?? { count: 0, max_updated_at: null, paths_hash: null };
      return {
        count: Number(row.count) || 0,
        maxUpdatedAt: toIsoOrNull(row.max_updated_at),
        pathsHash: row.paths_hash ?? null
      };
    }
  };
}

function toIsoOrNull(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  const date = value instanceof Date ? value : new Date(value as string);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
