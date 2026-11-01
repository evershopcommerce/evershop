process.env.ALLOW_CONFIG_MUTATIONS = 'true';
import { jest, describe, it, expect, beforeAll, beforeEach } from '@jest/globals';

/**
 * COD emits `order_placed` from `hookAfter('createOrderFunc')`, after the
 * order transaction has committed. It emitted the insert result it was
 * handed, which still says `payment_status: 'pending'`: the `saveOrder` hook
 * had already moved the order to `cod_pending` (and createOrderFunc had
 * recomputed `shipment_status`) in that transaction. Webhook deliveries and
 * every subscriber that reads the event data saw the stale order. The hook
 * now emits the committed row.
 *
 * The REAL cod bootstrap registers the hook; the pool it reads through is a
 * stand-in that holds the committed row.
 */
const committedRow = {
  order_id: 7,
  uuid: 'order-7',
  payment_method: 'cod',
  payment_status: 'cod_pending',
  shipment_status: 'delivered',
  status: 'processing',
  grand_total: '25.0000'
};
const queries: string[] = [];
const emitted: Array<{ name: string; data: Record<string, unknown> }> = [];
const logged: unknown[] = [];
let failEmit = false;

const fakePool = {
  async query(sql: string | { text: string }) {
    queries.push(typeof sql === 'string' ? sql : sql.text);
    return { rows: [{ ...committedRow }] };
  },
  release() {}
};

jest.unstable_mockModule('../../../setting/services/setting.js', () => ({
  getSetting: async (_name: string, def: unknown) => def
}));
jest.unstable_mockModule('../../../../lib/postgres/connection.js', () => ({
  pool: fakePool,
  getConnection: async () => fakePool
}));
jest.unstable_mockModule('../../../../lib/event/emitter.js', () => ({
  emit: async (name: string, data: Record<string, unknown>) => {
    if (failEmit) {
      throw new Error('event table unavailable');
    }
    emitted.push({ name, data });
  }
}));
jest.unstable_mockModule('../../../../lib/log/logger.js', () => ({
  error: (e: unknown) => logged.push(e),
  warning: () => undefined,
  info: () => undefined,
  debug: () => undefined,
  success: () => undefined
}));

const { default: codBootstrap } = await import('../../bootstrap.js');
const { getHooks } = await import('../../../../lib/util/hookable.js');

let emitOrderPlaced: (order: Record<string, unknown>) => Promise<void>;

beforeAll(async () => {
  await codBootstrap();
  const hook = (getHooks().afterHooks.get('createOrderFunc') ?? []).find(
    (h) => h.callback.name === 'EmitOrderPlacedEvent'
  );
  emitOrderPlaced = hook!.callback as typeof emitOrderPlaced;
});

beforeEach(() => {
  queries.length = 0;
  emitted.length = 0;
  logged.length = 0;
  failEmit = false;
});

// What createOrderFunc returns: the row as it was inserted
const insertResult = {
  insertId: 7,
  order_id: 7,
  uuid: 'order-7',
  payment_method: 'cod',
  payment_status: 'pending',
  shipment_status: 'pending',
  status: 'new',
  grand_total: '25.0000'
};

describe('COD order_placed', () => {
  it('carries the committed order, not the insert result', async () => {
    await emitOrderPlaced({ ...insertResult });
    expect(emitted).toHaveLength(1);
    expect(emitted[0].name).toBe('order_placed');
    expect(emitted[0].data).toMatchObject({
      order_id: 7,
      payment_status: 'cod_pending',
      shipment_status: 'delivered',
      status: 'processing'
    });
    expect(queries.some((q) => /FROM\s+"?order"?/i.test(q))).toBe(true);
  });

  it('does nothing for another payment method', async () => {
    await emitOrderPlaced({ ...insertResult, payment_method: 'stripe' });
    expect(emitted).toEqual([]);
    expect(queries).toEqual([]);
  });

  it('a failed emit is logged, not turned into a failed checkout for an order that exists', async () => {
    failEmit = true;
    await expect(emitOrderPlaced({ ...insertResult })).resolves.toBeUndefined();
    expect(logged).toHaveLength(1);
    expect(String(logged[0])).toContain('event table unavailable');
  });
});
