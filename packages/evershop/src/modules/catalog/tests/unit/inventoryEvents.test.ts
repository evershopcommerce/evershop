import { jest, describe, it, expect, afterAll } from '@jest/globals';
import type { Pool } from 'pg';
import {
  createOrder,
  openScratchDb,
  type ScratchDb
} from '../../../oms/tests/unit/helpers/orderScratchDb.js';

/**
 * The database trigger on `product_inventory` (catalog migration 1.0.17):
 * - writes `inventory_updated` only when a column changed, not on every
 *   UPDATE (an admin save with the same stock wrote one);
 * - names the product in the payload: `product_id`, `product_uuid`, `sku`,
 *   next to the `old` and `new` rows;
 * - writes `product_back_in_stock` when the row goes from out of stock to in
 *   stock, by the storefront's rule (`isInStock`): stock not managed, or a
 *   quantity above 0 with stock availability on.
 *
 * Runs on a scratch database with every core migration, and skips itself
 * when no Postgres server is reachable.
 */
jest.setTimeout(60000);

const scratch: ScratchDb | null = await openScratchDb(
  'evershop_inventory_events_scratch_test'
);
const describeDb = scratch ? describe : describe.skip;

afterAll(async () => {
  await scratch?.close();
});

interface Inventory {
  qty: number;
  manage_stock: boolean;
  stock_availability: boolean;
}

let rowSequence = 0;

/** A row of `table`, every required column filled from the real schema */
async function insertRow(
  db: Pool,
  table: string,
  values: Record<string, unknown>
): Promise<Record<string, any>> {
  const { rows: columns } = await db.query(
    `SELECT column_name, data_type FROM information_schema.columns
      WHERE table_schema = current_schema() AND table_name = $1
        AND is_nullable = 'NO' AND column_default IS NULL
        AND is_identity = 'NO'`,
    [table]
  );
  rowSequence += 1;
  const given: Record<string, unknown> = {};
  columns.forEach((c) => {
    given[c.column_name] = /int|numeric|double|real/.test(c.data_type)
      ? 1
      : c.data_type === 'boolean'
      ? false
      : /timestamp|date/.test(c.data_type)
      ? new Date()
      : /json/.test(c.data_type)
      ? '{}'
      : `test-${table}-${rowSequence}`;
  });
  Object.assign(given, values);
  const names = Object.keys(given);
  const { rows } = await db.query(
    `INSERT INTO "${table}" (${names.map((n) => `"${n}"`).join(', ')})
     VALUES (${names.map((_, i) => `$${i + 1}`).join(', ')})
     RETURNING *`,
    names.map((n) => given[n])
  );
  return rows[0];
}

describeDb('product_inventory events (scratch DB)', () => {
  // Read while collecting a skipped suite too: no destructuring of null
  const db = scratch?.db as ScratchDb['db'];

  async function createProduct(inventory: Inventory) {
    const product = await insertRow(db, 'product', {
      sku: `SKU-${rowSequence + 1}`
    });
    await insertRow(db, 'product_inventory', {
      product_inventory_product_id: product.product_id,
      ...inventory
    });
    return product;
  }

  function setInventory(productId: number, values: Partial<Inventory>) {
    const names = Object.keys(values);
    return db.query(
      `UPDATE product_inventory
          SET ${names.map((n, i) => `"${n}" = $${i + 2}`).join(', ')}
        WHERE product_inventory_product_id = $1`,
      [productId, ...names.map((n) => values[n as keyof Inventory])]
    );
  }

  /** The inventory events of a product, oldest first */
  async function events(productId: number) {
    const { rows } = await db.query(
      `SELECT name, data FROM event
        WHERE name IN ('inventory_updated', 'product_back_in_stock')
          AND (data->>'product_id')::int = $1
        ORDER BY event_id`,
      [productId]
    );
    return rows as Array<{ name: string; data: Record<string, any> }>;
  }

  const managed = (qty: number, available = true): Inventory => ({
    qty,
    manage_stock: true,
    stock_availability: available
  });

  it('a save that changes nothing writes no event', async () => {
    const product = await createProduct(managed(5));
    // An admin save writes every column, with the same values
    await setInventory(product.product_id, managed(5));
    await db.query(
      `UPDATE product_inventory SET qty = qty
        WHERE product_inventory_product_id = $1`,
      [product.product_id]
    );
    expect(await events(product.product_id)).toEqual([]);
    // Positive control: a real change on the same row writes one
    await setInventory(product.product_id, { qty: 4 });
    expect(await events(product.product_id)).toHaveLength(1);
  });

  it('inventory_updated names the product and carries both rows', async () => {
    const product = await createProduct(managed(5));
    await setInventory(product.product_id, { qty: 3 });
    const [event] = await events(product.product_id);
    expect(event).toEqual({
      name: 'inventory_updated',
      data: {
        product_id: product.product_id,
        product_uuid: product.uuid,
        sku: product.sku,
        old: expect.objectContaining({
          product_inventory_product_id: product.product_id,
          qty: 5
        }),
        new: expect.objectContaining({
          product_inventory_product_id: product.product_id,
          qty: 3
        })
      }
    });
  });

  it.each<[string, boolean, Inventory, Partial<Inventory>]>([
    ['0 to 5', true, managed(0), { qty: 5 }],
    ['an oversold -2 to 3', true, managed(-2), { qty: 3 }],
    ['stock availability turned on', true, managed(5, false), { stock_availability: true }],
    ['stock no longer managed', true, managed(0), { manage_stock: false }],
    ['5 to 6', false, managed(5), { qty: 6 }],
    ['5 to 0', false, managed(5), { qty: 0 }],
    ['out of stock either way', false, managed(0), { stock_availability: false }],
    ['availability on, but still no quantity', false, managed(0, false), { stock_availability: true }],
    ['managed again, with no quantity', false, { qty: 0, manage_stock: false, stock_availability: false }, { manage_stock: true }],
    ['not managed either way', false, { qty: 0, manage_stock: false, stock_availability: true }, { qty: 3 }]
  ])('%s: back in stock = %s', async (_, backInStock, from, change) => {
    const product = await createProduct(from);
    await setInventory(product.product_id, change);
    const written = await events(product.product_id);
    expect(written.map((e) => e.name)).toEqual(
      backInStock
        ? ['inventory_updated', 'product_back_in_stock']
        : ['inventory_updated']
    );
    if (backInStock) {
      const now = { ...from, ...change };
      expect(written[1].data).toEqual({
        product_id: product.product_id,
        product_uuid: product.uuid,
        sku: product.sku,
        qty: now.qty,
        manage_stock: now.manage_stock,
        stock_availability: now.stock_availability
      });
    }
  });

  it('an order takes the last one (no back in stock); a restock brings it back', async () => {
    const product = await createProduct(managed(1));
    const order = await createOrder(db);
    // The real stock trigger on order_item (checkout migration 1.0.13)
    await insertRow(db, 'order_item', {
      order_item_order_id: order.order_id,
      product_id: product.product_id,
      product_sku: product.sku,
      qty: 1
    });
    // As cancelOrder gives the stock back
    await db.query(
      `UPDATE product_inventory SET qty = qty + 1
        WHERE product_inventory_product_id = $1`,
      [product.product_id]
    );
    const written = await events(product.product_id);
    expect(
      written.map((e) => [e.name, e.data.new?.qty ?? e.data.qty])
    ).toEqual([
      ['inventory_updated', 0],
      ['inventory_updated', 1],
      ['product_back_in_stock', 1]
    ]);
  });

  it('migration 1.0.17 replaces the old trigger, and runs twice without harm', async () => {
    const triggerDefinitions = async () =>
      (
        await db.query(
          `SELECT pg_get_triggerdef(oid) AS def FROM pg_trigger
            WHERE tgrelid = 'product_inventory'::regclass
              AND tgname = 'ADD_INVENTORY_UPDATED_EVENT_TRIGGER'`
        )
      ).rows.map((row) => row.def as string);
    // The trigger as catalog 1.0.4 made it: no WHEN clause
    await db.query(
      `DROP TRIGGER "ADD_INVENTORY_UPDATED_EVENT_TRIGGER" ON product_inventory`
    );
    await db.query(`CREATE TRIGGER "ADD_INVENTORY_UPDATED_EVENT_TRIGGER"
      AFTER UPDATE ON "product_inventory" FOR EACH ROW
      EXECUTE PROCEDURE add_product_inventory_updated_event()`);
    const product = await createProduct(managed(5));
    await setInventory(product.product_id, managed(5));
    expect(await events(product.product_id)).toHaveLength(1); // the old way

    const { default: migration } = await import(
      '../../migration/Version-1.0.17.js'
    );
    const connection = await db.connect();
    try {
      await migration(connection as never);
      await migration(connection as never);
    } finally {
      connection.release();
    }
    const definitions = await triggerDefinitions();
    expect(definitions).toHaveLength(1);
    expect(definitions[0]).toMatch(/WHEN \(.*old\.\*.* IS DISTINCT FROM new\.\*/i);
    await setInventory(product.product_id, managed(5));
    expect(await events(product.product_id)).toHaveLength(1); // no new one
  });
});
