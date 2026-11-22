process.env.ALLOW_CONFIG_MUTATIONS = 'true';
import { jest, describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import {
  createOrder,
  openScratchDb,
  type ScratchDb
} from './helpers/orderScratchDb.js';

/**
 * The admin order grid sorted by number (`ob=number`) puts the numbers in the
 * order they were given. It sorted them as text: 100000 came before 99999,
 * and an imported 9999 after 10001.
 *
 * Runs the grid's own query (the admin `orders` resolver's OrderCollection,
 * with the oms filters) on a scratch database with every core migration;
 * skips itself when no Postgres server is reachable.
 */
jest.setTimeout(60000);

const scratch: ScratchDb | null = await openScratchDb(
  'evershop_order_grid_sort_scratch_test'
);
const describeDb = scratch ? describe : describe.skip;

describeDb('the admin order grid sorted by number (scratch DB)', () => {
  // Read while collecting a skipped suite too: no destructuring of null
  const db = scratch?.db as ScratchDb['db'];
  let sortedNumbers: (direction: 'asc' | 'desc') => Promise<string[]>;

  beforeAll(async () => {
    // The grid's filters (ob, od, page...) come from the oms bootstrap
    const { default: bootstrap } = await import('../../bootstrap.js');
    await bootstrap();
    const { OrderCollection } = (await import(
      '../../services/OrderCollection.js'
    )) as any;
    const { getOrdersBaseQuery } = await import(
      '../../services/getOrdersBaseQuery.js'
    );
    sortedNumbers = async (direction) => {
      const collection = new OrderCollection(getOrdersBaseQuery());
      await collection.init([
        { key: 'ob', operation: 'eq', value: 'number' },
        { key: 'od', operation: 'eq', value: direction }
      ]);
      const items: Array<{ orderNumber: string }> = await collection.items();
      return items.map((item) => item.orderNumber);
    };

    // An imported order, kept with its own number, then four that core
    // numbered (10000 plus the id) across 99999 to 100000
    await db.query(
      'ALTER TABLE "order" ALTER COLUMN order_id RESTART WITH 89997'
    );
    const imported = await createOrder(db, { order_number: '9999' });
    expect(imported.order_id).toBe(89997);
    for (let i = 0; i < 4; i += 1) {
      const order = await createOrder(db);
      await db.query(
        'UPDATE "order" SET order_number = $1 WHERE order_id = $2',
        [String(10000 + order.order_id), order.order_id]
      );
    }
  });

  afterAll(async () => {
    await scratch?.close();
  });

  it('puts the numbers in the order they were given, both ways', async () => {
    const given = ['9999', '99998', '99999', '100000', '100001'];
    expect(await sortedNumbers('asc')).toEqual(given);
    expect(await sortedNumbers('desc')).toEqual([...given].reverse());
  });
});
