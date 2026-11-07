import { randomUUID } from 'crypto';
import { jest, describe, it, expect, afterAll } from '@jest/globals';
import type { Pool } from 'pg';
import {
  openScratchDb,
  type ScratchDb
} from '../../../oms/tests/unit/helpers/orderScratchDb.js';

/**
 * The database trigger on `cart` (checkout migration 1.0.15) writes
 * `cart_email_added` when an open cart gets an email or its email changes,
 * whatever wrote it (the checkout's contact step, a sign-in, a signed-in
 * customer's new cart, SQL). `saveCart` writes every column on each save, so
 * the same email again must write nothing. The payload names the cart by
 * `cart_id`, never by its uuid.
 *
 * Runs on a scratch database with every core migration, and skips itself
 * when no Postgres server is reachable.
 */
jest.setTimeout(60000);

const scratch: ScratchDb | null = await openScratchDb(
  'evershop_cart_email_event_scratch_test'
);
const describeDb = scratch ? describe : describe.skip;

afterAll(async () => {
  await scratch?.close();
});

let rowSequence = 0;

/** A `cart` row, every required column filled from the real schema */
async function insertCart(
  db: Pool,
  values: Record<string, unknown>
): Promise<Record<string, any>> {
  const { rows: columns } = await db.query(
    `SELECT column_name, data_type FROM information_schema.columns
      WHERE table_schema = current_schema() AND table_name = 'cart'
        AND is_nullable = 'NO' AND column_default IS NULL
        AND is_identity = 'NO'`
  );
  rowSequence += 1;
  const given: Record<string, unknown> = {};
  columns.forEach((c) => {
    given[c.column_name] =
      c.data_type === 'uuid'
        ? randomUUID()
        : /int|numeric|double|real/.test(c.data_type)
        ? 1
        : c.data_type === 'boolean'
        ? false
        : /timestamp|date/.test(c.data_type)
        ? new Date()
        : /json/.test(c.data_type)
        ? '{}'
        : `test-cart-${rowSequence}`;
  });
  Object.assign(given, { status: true, customer_email: null }, values);
  const names = Object.keys(given);
  const { rows } = await db.query(
    `INSERT INTO "cart" (${names.map((n) => `"${n}"`).join(', ')})
     VALUES (${names.map((_, i) => `$${i + 1}`).join(', ')})
     RETURNING *`,
    names.map((n) => given[n])
  );
  return rows[0];
}

describeDb('cart_email_added (scratch DB)', () => {
  // Read while collecting a skipped suite too: no destructuring of null
  const db = scratch?.db as ScratchDb['db'];

  async function events(cartId: number) {
    const { rows } = await db.query(
      `SELECT data FROM event
        WHERE name = 'cart_email_added' AND (data->>'cart_id')::int = $1
        ORDER BY event_id`,
      [cartId]
    );
    return rows.map((r) => r.data);
  }
  const setEmail = (cartId: number, email: string | null) =>
    db.query(`UPDATE cart SET customer_email = $2 WHERE cart_id = $1`, [cartId, email]);

  it('a cart without an email writes nothing; getting one writes the cart id, the email and the customer id', async () => {
    const cart = await insertCart(db, {});
    expect(await events(cart.cart_id)).toEqual([]);
    await setEmail(cart.cart_id, 'guest@example.com');
    expect(await events(cart.cart_id)).toEqual([
      { cart_id: cart.cart_id, customer_email: 'guest@example.com', customer_id: null }
    ]);
  });

  it('the same email saved again writes nothing (saveCart writes every column)', async () => {
    const cart = await insertCart(db, {});
    await setEmail(cart.cart_id, 'guest@example.com');
    await db.query(
      `UPDATE cart SET customer_email = $2, status = TRUE, sid = 'another-session' WHERE cart_id = $1`,
      [cart.cart_id, 'guest@example.com']
    );
    await db.query(`UPDATE cart SET sid = 'yet-another' WHERE cart_id = $1`, [cart.cart_id]);
    expect(await events(cart.cart_id)).toHaveLength(1);
  });

  it('a new email writes another event; removing the email writes nothing', async () => {
    const cart = await insertCart(db, {});
    await setEmail(cart.cart_id, 'typed@example.com');
    await setEmail(cart.cart_id, 'account@example.com');
    await setEmail(cart.cart_id, null);
    expect((await events(cart.cart_id)).map((e) => e.customer_email)).toEqual([
      'typed@example.com',
      'account@example.com'
    ]);
  });

  it("a cart created with an email (a signed-in customer's) writes one at once", async () => {
    const cart = await insertCart(db, { customer_email: 'c7@example.com', customer_id: 7 });
    expect(await events(cart.cart_id)).toEqual([
      { cart_id: cart.cart_id, customer_email: 'c7@example.com', customer_id: 7 }
    ]);
  });

  it('a closed cart (ordered or restored) writes nothing', async () => {
    const closed = await insertCart(db, { status: false, customer_email: 'x@example.com' });
    const open = await insertCart(db, {});
    await db.query(`UPDATE cart SET status = FALSE WHERE cart_id = $1`, [open.cart_id]);
    await setEmail(open.cart_id, 'late@example.com');
    expect(await events(closed.cart_id)).toEqual([]);
    expect(await events(open.cart_id)).toEqual([]);
  });

  it('an import writes nothing (evershop.importing for the transaction)', async () => {
    const cart = await insertCart(db, {});
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      await client.query(`SELECT set_config('evershop.importing', 'on', true)`);
      await client.query(`UPDATE cart SET customer_email = 'imported@example.com' WHERE cart_id = $1`, [cart.cart_id]);
      await client.query('COMMIT');
    } finally {
      client.release();
    }
    expect(await events(cart.cart_id)).toEqual([]);
  });

  it('never puts the uuid in the payload', async () => {
    const cart = await insertCart(db, { customer_email: 'u@example.com' });
    const [event] = await events(cart.cart_id);
    expect(Object.keys(event).sort()).toEqual(['cart_id', 'customer_email', 'customer_id']);
    expect(JSON.stringify(event)).not.toContain(cart.uuid);
  });
});
