import type { Pool } from 'pg';
import { EVENT_STUCK_AFTER_MS } from '../services/ports/eventBacklog.js';
import type {
  PageAddresses,
  PageEntity
} from '../services/ports/pageAddresses.js';

// What each kind of record is called in the tables, the event and its payload.
const KINDS: Record<PageEntity, { table: string; id: string; event: string }> =
  {
    product: {
      table: 'product',
      id: 'product_id',
      event: 'product_created'
    },
    category: {
      table: 'category',
      id: 'category_id',
      event: 'category_created'
    }
  };

/**
 * Writes the creation event again for the records that lost theirs (IMP-08). The
 * event is what the database trigger writes: the name, and the row as JSON. A
 * record is lost when it was created since `since`, has no `url_rewrite` row, and
 * has no event that is still to be handled: one `pending`, or one `processing`
 * for less than the time core allows before it counts it as lost. One statement,
 * so the records that need it are found and their events written together.
 */
export class PgPageAddresses implements PageAddresses {
  constructor(private readonly pool: Pool) {}

  async reemitMissing(entity: PageEntity, since: number): Promise<number> {
    const kind = KINDS[entity];
    const result = await this.pool.query(
      `WITH live AS (
         SELECT (data->>'${kind.id}')::int AS id
           FROM event
          WHERE name = '${kind.event}'
            AND (status = 'pending'
                 OR (status = 'processing'
                     AND started_at > now() - ($2 * interval '1 millisecond')))
       ), lost AS (
         SELECT r.${kind.id} AS id, row_to_json(r) AS data
           FROM ${kind.table} r
          WHERE r.created_at >= to_timestamp($1 / 1000.0)
            AND NOT EXISTS (
              SELECT 1 FROM url_rewrite u
               WHERE u.entity_type = '${entity}' AND u.entity_uuid = r.uuid)
            AND r.${kind.id} NOT IN (SELECT id FROM live WHERE id IS NOT NULL)
       ), written AS (
         INSERT INTO event (name, data)
         SELECT '${kind.event}', data FROM lost ORDER BY id
         RETURNING 1
       )
       SELECT count(*)::int AS n FROM written`,
      [since, EVENT_STUCK_AFTER_MS]
    );
    return Number(result.rows[0].n);
  }

  async withAddress(
    entity: PageEntity,
    ids: readonly number[]
  ): Promise<Set<number>> {
    const kind = KINDS[entity];
    const result = await this.pool.query(
      `SELECT r.${kind.id} AS id
         FROM ${kind.table} r
        WHERE r.${kind.id} = ANY($1::int[])
          AND EXISTS (
            SELECT 1 FROM url_rewrite u
             WHERE u.entity_type = '${entity}' AND u.entity_uuid = r.uuid)`,
      [ids]
    );
    return new Set(result.rows.map((row) => Number(row.id)));
  }
}
