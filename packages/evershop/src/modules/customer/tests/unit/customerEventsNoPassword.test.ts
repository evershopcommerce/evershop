import { jest, describe, it, expect, afterAll } from '@jest/globals';
import {
  openScratchDb,
  type ScratchDb
} from '../../../oms/tests/unit/helpers/orderScratchDb.js';

/**
 * The database triggers on `customer` (customer migration 1.0.7) write
 * `customer_created`, `customer_updated` and `customer_deleted` with the row
 * but never its password hash: a password change used to send the new hash
 * to every subscriber.
 *
 * Runs on a scratch database with every core migration, and skips itself
 * when no Postgres server is reachable.
 */
jest.setTimeout(60000);

const scratch: ScratchDb | null = await openScratchDb(
  'evershop_customer_events_scratch_test'
);
const describeDb = scratch ? describe : describe.skip;

afterAll(async () => {
  await scratch?.close();
});

describeDb('customer events without the password (scratch DB)', () => {
  // Read while collecting a skipped suite too: no destructuring of null
  const db = scratch?.db as ScratchDb['db'];

  async function events(email: string) {
    const { rows } = await db.query(
      `SELECT name, data FROM event
        WHERE name LIKE 'customer_%' AND data->>'email' = $1
        ORDER BY event_id`,
      [email]
    );
    return rows as Array<{ name: string; data: Record<string, unknown> }>;
  }

  it('created, updated (a password change included) and deleted carry the row, never the password', async () => {
    const email = 'jane-events@example.com';
    const { rows } = await db.query(
      `INSERT INTO customer (email, password, full_name, status, group_id)
       VALUES ($1, '$2a$10$firsthashfirsthash', 'Jane', 1, 1) RETURNING customer_id`,
      [email]
    );
    const id = rows[0].customer_id;
    await db.query(`UPDATE customer SET password = '$2a$10$secondhashsecondhash' WHERE customer_id = $1`, [id]);
    await db.query(`UPDATE customer SET full_name = 'Jane Doe' WHERE customer_id = $1`, [id]);
    await db.query(`DELETE FROM customer WHERE customer_id = $1`, [id]);

    const written = await events(email);
    expect(written.map((e) => e.name)).toEqual([
      'customer_created',
      'customer_updated',
      'customer_updated',
      'customer_deleted'
    ]);
    for (const event of written) {
      expect(event.data).not.toHaveProperty('password');
      expect(event.data).toMatchObject({ customer_id: id, email, status: 1 });
      expect(JSON.stringify(event.data)).not.toMatch(/firsthash|secondhash/);
    }
    expect(written[2].data.full_name).toBe('Jane Doe');
  });
});
