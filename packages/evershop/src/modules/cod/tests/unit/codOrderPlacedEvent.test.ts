process.env.ALLOW_CONFIG_MUTATIONS = 'true';
import { jest, describe, it, expect, beforeAll, beforeEach } from '@jest/globals';

/**
 * A COD order is placed when it is created: `hookAfter('createOrderFunc')`
 * calls `markOrderPlaced` once the order transaction has committed. It used to
 * emit the insert result it was handed, which still says
 * `payment_status: 'pending'` (the `saveOrder` hook had moved the order to
 * `cod_pending`); `markOrderPlaced` emits the committed row, once per order
 * (`oms/tests/unit/orderPlacedPaymentMethods.test.ts` runs it on a database).
 *
 * The REAL cod bootstrap registers the hook; `markOrderPlaced` is a stand-in.
 */
const placed: number[] = [];
const logged: unknown[] = [];
let failPlacing = false;

jest.unstable_mockModule('../../../setting/services/setting.js', () => ({
  getSetting: async (_name: string, def: unknown) => def
}));
jest.unstable_mockModule('../../../oms/services/markOrderPlaced.js', () => ({
  markOrderPlaced: async (orderId: number) => {
    if (failPlacing) {
      throw new Error('event table unavailable');
    }
    placed.push(orderId);
    return null;
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
  placed.length = 0;
  logged.length = 0;
  failPlacing = false;
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
  it('marks the created order placed, by its id', async () => {
    await emitOrderPlaced({ ...insertResult });
    expect(placed).toEqual([7]);
  });

  it('does nothing for another payment method', async () => {
    await emitOrderPlaced({ ...insertResult, payment_method: 'stripe' });
    expect(placed).toEqual([]);
  });

  it('a failure is logged, not turned into a failed checkout for an order that exists', async () => {
    failPlacing = true;
    await expect(emitOrderPlaced({ ...insertResult })).resolves.toBeUndefined();
    expect(logged).toHaveLength(1);
    expect(String(logged[0])).toContain('event table unavailable');
  });
});
