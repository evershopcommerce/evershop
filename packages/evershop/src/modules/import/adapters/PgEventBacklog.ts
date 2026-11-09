import type { Pool } from 'pg';
import { EVENT_STUCK_AFTER_MS } from '../services/ports/eventBacklog.js';
import type { EventBacklog } from '../services/ports/eventBacklog.js';

/**
 * The length of the event queue (§ 8.5): the events `pending`, and those
 * `processing` for less than the time core allows before it counts them as lost
 * (`EventStorage`). Both counts use the index on `(status, event_id)`, and the
 * table holds only the events that are not done, so the query is cheap enough
 * for the worker to ask once a second. It reads every event, whoever wrote it.
 */
export class PgEventBacklog implements EventBacklog {
  constructor(private readonly pool: Pool) {}

  async depth(): Promise<number> {
    const result = await this.pool.query(
      `SELECT (SELECT count(*) FROM event WHERE status = 'pending')
            + (SELECT count(*) FROM event
                WHERE status = 'processing'
                  AND started_at > now() - ($1 * interval '1 millisecond')) AS depth`,
      [EVENT_STUCK_AFTER_MS]
    );
    return Number(result.rows[0].depth);
  }
}
