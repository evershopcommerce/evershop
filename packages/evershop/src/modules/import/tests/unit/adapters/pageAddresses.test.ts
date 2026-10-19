import { afterAll, describe, expect, it, jest } from '@jest/globals';
import { PgPageAddresses } from '../../../adapters/PgPageAddresses.js';
import { EVENT_STUCK_AFTER_MS } from '../../../services/ports/eventBacklog.js';
import { openScratchDb, pointCoreAt } from '../helpers/scratchDb.js';

/**
 * The repair of the page addresses (IMP-08) on the second scratch database, a
 * copy of the core schema with the real triggers: the creation event of a record
 * is written again only for a record that has no address and no event to be
 * handled, and the event it writes is one the real subscriber turns into the
 * address. Each test removes what it made.
 */
jest.setTimeout(60_000);

const db = await openScratchDb({ core: true });
if (db) pointCoreAt(db);
const describeDb = db ? describe : describe.skip;

const corePool = db
  ? (await import('../../../../../lib/postgres/connection.js')).pool
  : null;
const buildCategoryAddress = db
  ? (
      await import(
        '../../../../catalog/subscribers/category_created/buildUrlRewrite.js'
      )
    ).default
  : null;
const buildProductAddress = db
  ? (
      await import(
        '../../../../catalog/subscribers/product_created/buildUrlRewrite.js'
      )
    ).default
  : null;

afterAll(async () => {
  await corePool?.end();
  await db?.close();
});

const q = async (sql: string, params: unknown[] = []) =>
  (await db!.pool.query(sql, params)).rows;

let eventBaseline = 0;

async function cleanUp() {
  await q(`DELETE FROM product WHERE sku LIKE 'PA-%'`);
  await q(
    `DELETE FROM url_rewrite WHERE request_path LIKE '/pa-%' OR request_path LIKE '/pa-cat%'`
  );
  await q(
    `DELETE FROM category WHERE category_id IN
       (SELECT category_description_category_id FROM category_description WHERE url_key LIKE 'pa-%')`
  );
  // A trigger refuses to delete the default attribute group (the first one).
  await q(
    `DO $$ BEGIN
       ALTER TABLE attribute_group DISABLE TRIGGER USER;
       DELETE FROM attribute_group WHERE group_name = 'Page address group';
       ALTER TABLE attribute_group ENABLE TRIGGER USER;
     END $$`
  );
  await q('DELETE FROM event WHERE event_id > $1', [eventBaseline]);
}

async function start() {
  eventBaseline = Number(
    (await q('SELECT COALESCE(max(event_id), 0) AS n FROM event'))[0].n
  );
  await cleanUp();
  eventBaseline = Number(
    (await q('SELECT COALESCE(max(event_id), 0) AS n FROM event'))[0].n
  );
  // A product without a group gets group 1, so group 1 must be there.
  await q(
    `INSERT INTO attribute_group (attribute_group_id, group_name)
     OVERRIDING SYSTEM VALUE VALUES (1, 'Page address group')
     ON CONFLICT (attribute_group_id) DO UPDATE SET group_name = 'Page address group'`
  );
}

const minuteAgo = () => Date.now() - 60_000;

async function category(key: string) {
  const [row] = await q(
    `INSERT INTO category (status) VALUES (true) RETURNING category_id, uuid`
  );
  await q(
    `INSERT INTO category_description (category_description_category_id, name, url_key)
     VALUES ($1, $2, $2)`,
    [row.category_id, key]
  );
  return { id: row.category_id as number, uuid: row.uuid as string };
}

async function product(sku: string) {
  const [row] = await q(
    `INSERT INTO product (sku, price) VALUES ($1, 1) RETURNING product_id, uuid`,
    [sku]
  );
  await q(
    `INSERT INTO product_description (product_description_product_id, name, url_key)
     VALUES ($1, $2, $2)`,
    [row.product_id, sku.toLowerCase()]
  );
  return { id: row.product_id as number, uuid: row.uuid as string };
}

/** The events of a kind for a record, oldest first. */
const events = (name: string, idColumn: string, id: number) =>
  q(
    `SELECT event_id, status, data FROM event
      WHERE name = $1 AND (data->>'${idColumn}')::int = $2 ORDER BY event_id`,
    [name, id]
  );

const losing = (name: string, idColumn: string, id: number) =>
  q(`DELETE FROM event WHERE name = $1 AND (data->>'${idColumn}')::int = $2`, [
    name,
    id
  ]);

describeDb(
  'PgPageAddresses: the creation events that were lost (IMP-08)',
  () => {
    it('writes the event again for a category that has no address and no event, the same payload as the trigger', async () => {
      await start();
      try {
        const pages = new PgPageAddresses(db!.pool);
        const { id } = await category('pa-one');
        const [made] = await events('category_created', 'category_id', id);
        expect(made.status).toBe('pending');
        await losing('category_created', 'category_id', id);

        expect(await pages.reemitMissing('category', minuteAgo())).toBe(1);
        const again = await events('category_created', 'category_id', id);
        expect(again).toHaveLength(1);
        expect(again[0].status).toBe('pending');
        expect(again[0].data).toEqual(made.data);
        // A second look finds an event to be handled: nothing more is written.
        expect(await pages.reemitMissing('category', minuteAgo())).toBe(0);
        expect(
          await events('category_created', 'category_id', id)
        ).toHaveLength(1);
      } finally {
        await cleanUp();
      }
    });

    it('writes an event the real subscriber turns into the page address, and then leaves the record alone', async () => {
      await start();
      try {
        const pages = new PgPageAddresses(db!.pool);
        const { id, uuid } = await category('pa-cat');
        await losing('category_created', 'category_id', id);
        await pages.reemitMissing('category', minuteAgo());
        const [event] = await events('category_created', 'category_id', id);
        await buildCategoryAddress!(event.data);
        expect(
          await q(
            `SELECT request_path, target_path FROM url_rewrite WHERE entity_uuid = $1`,
            [uuid]
          )
        ).toEqual([
          { request_path: '/pa-cat', target_path: `/category/${uuid}` }
        ]);
        // Handled and gone, as the event process leaves it; the record has its address.
        await losing('category_created', 'category_id', id);
        expect(await pages.reemitMissing('category', minuteAgo())).toBe(0);
      } finally {
        await cleanUp();
      }
    });

    it('does the same for a product', async () => {
      await start();
      try {
        const pages = new PgPageAddresses(db!.pool);
        const { id, uuid } = await product('PA-1');
        await losing('product_created', 'product_id', id);
        expect(await pages.reemitMissing('product', minuteAgo())).toBe(1);
        const [event] = await events('product_created', 'product_id', id);
        expect(event.data.sku).toBe('PA-1');
        await buildProductAddress!(event.data);
        expect(
          await q(
            `SELECT request_path FROM url_rewrite WHERE entity_uuid = $1`,
            [uuid]
          )
        ).toEqual([{ request_path: '/pa-1' }]);
      } finally {
        await cleanUp();
      }
    });

    it('leaves a record alone while its event is still to be handled: pending, or processing for less than the stuck time', async () => {
      await start();
      try {
        const pages = new PgPageAddresses(db!.pool);
        const pending = await category('pa-pending');
        const busy = await category('pa-busy');
        await losing('category_created', 'category_id', busy.id);
        await q(
          `INSERT INTO event (name, data, status, started_at)
         VALUES ('category_created', json_build_object('category_id', $1::int), 'processing', now())`,
          [busy.id]
        );
        expect(pending.id).toBeGreaterThan(0);
        expect(await pages.reemitMissing('category', minuteAgo())).toBe(0);
      } finally {
        await cleanUp();
      }
    });

    it('counts an event as lost when it has been processing for longer than core waits, or has failed', async () => {
      await start();
      try {
        const pages = new PgPageAddresses(db!.pool);
        const stuck = await category('pa-stuck');
        const failed = await category('pa-failed');
        await losing('category_created', 'category_id', stuck.id);
        await losing('category_created', 'category_id', failed.id);
        await q(
          `INSERT INTO event (name, data, status, started_at)
         VALUES ('category_created', json_build_object('category_id', $1::int), 'processing',
                 now() - ($2 * interval '1 millisecond') - interval '1 minute')`,
          [stuck.id, EVENT_STUCK_AFTER_MS]
        );
        await q(
          `INSERT INTO event (name, data, status)
         VALUES ('category_created', json_build_object('category_id', $1::int), 'failed')`,
          [failed.id]
        );
        expect(await pages.reemitMissing('category', minuteAgo())).toBe(2);
        for (const { id } of [stuck, failed]) {
          // eslint-disable-next-line no-await-in-loop
          const pendingOnes = (
            await events('category_created', 'category_id', id)
          ).filter((e) => e.status === 'pending');
          expect(pendingOnes).toHaveLength(1);
        }
      } finally {
        await cleanUp();
      }
    });

    it('leaves alone a record that has an address, one made before the job began, and the other kind of record', async () => {
      await start();
      try {
        const pages = new PgPageAddresses(db!.pool);
        const has = await category('pa-has');
        await losing('category_created', 'category_id', has.id);
        await q(
          `INSERT INTO url_rewrite (request_path, target_path, entity_uuid, entity_type)
         VALUES ('/pa-has', $2, $1, 'category')`,
          [has.uuid, `/category/${has.uuid}`]
        );
        const old = await category('pa-old');
        await losing('category_created', 'category_id', old.id);
        const lost = await category('pa-lost');
        await losing('category_created', 'category_id', lost.id);
        // The job began after `pa-old` was made: only what came later counts.
        await q(
          `UPDATE category SET created_at = now() - interval '2 hours' WHERE category_id = $1`,
          [old.id]
        );
        const prod = await product('PA-2');
        await losing('product_created', 'product_id', prod.id);

        expect(
          await pages.reemitMissing('category', Date.now() - 3_600_000)
        ).toBe(1);
        expect(
          await events('category_created', 'category_id', lost.id)
        ).toHaveLength(1);
        expect(
          await events('category_created', 'category_id', has.id)
        ).toHaveLength(0);
        expect(
          await events('category_created', 'category_id', old.id)
        ).toHaveLength(0);
        expect(
          await events('product_created', 'product_id', prod.id)
        ).toHaveLength(0);
      } finally {
        await cleanUp();
      }
    });

    it('writes one event for each lost record of a large batch, and each only once', async () => {
      await start();
      try {
        const pages = new PgPageAddresses(db!.pool);
        const ids: number[] = [];
        for (let n = 0; n < 40; n += 1) {
          // eslint-disable-next-line no-await-in-loop
          ids.push((await category(`pa-batch-${n}`)).id);
        }
        await q(
          `DELETE FROM event WHERE name = 'category_created' AND event_id > $1`,
          [eventBaseline]
        );
        expect(await pages.reemitMissing('category', minuteAgo())).toBe(40);
        const written = await q(
          `SELECT (data->>'category_id')::int AS id, count(*)::int AS n FROM event
          WHERE name = 'category_created' AND event_id > $1 GROUP BY 1`,
          [eventBaseline]
        );
        expect(written.map((r) => r.id).sort((a, b) => a - b)).toEqual(ids);
        expect(written.every((r) => r.n === 1)).toBe(true);
        expect(await pages.reemitMissing('category', minuteAgo())).toBe(0);
      } finally {
        await cleanUp();
      }
    });
  }
);
