import '../../../frontStore/customer/address/tests/unit/domSetup.js';
import type {
  AnyCommerceEvent,
  CommerceCart
} from '@evershop/evershop/types/commerceEvents';
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

/**
 * The commerce event bus (`components/common/commerceEvents.ts`):
 * - an event gets an envelope (id, seq, timestamp, page context) and is
 *   frozen;
 * - listeners run in later tasks, one task each, so pixel code does
 *   not hold up the page's update; a listener that throws does not stop the
 *   others;
 * - a listener that subscribes late gets the page's earlier events
 *   (`replayed: true`), never twice;
 * - pending events are delivered at once when the page is left.
 */
const { dispatchCommerceEvent, onCommerceEvent, flushCommerceEvents } =
  await import('../../commerceEvents.js');

const cart: CommerceCart = {
  cartId: 'cart-1',
  currency: 'USD',
  value: 20,
  totalQty: 2,
  items: []
};

/** Wait for the bus: a frame, then a task per listener */
const settle = async () => {
  for (let i = 0; i < 10; i += 1) {
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
};

const names = (events: AnyCommerceEvent[]) => events.map((e) => e.name);

describe('commerce event bus', () => {
  let consoleError: ReturnType<typeof jest.spyOn>;

  beforeEach(() => {
    delete (window as unknown as Record<string, unknown>)
      .__evershopCommerceEvents;
    document.title = 'Cart';
    document.documentElement.lang = 'fr';
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleError.mockRestore();
  });

  it('wraps the data in a frozen envelope', async () => {
    const event = dispatchCommerceEvent('cart_viewed', { ...cart, items: [] });
    const second = dispatchCommerceEvent('checkout_started', cart);

    expect(event).toEqual({
      id: expect.stringMatching(/^[0-9a-f-]{36}$/),
      name: 'cart_viewed',
      version: 1,
      timestamp: expect.stringMatching(/^\d{4}-\d\d-\d\dT/),
      seq: 1,
      replayed: false,
      context: {
        url: 'http://localhost/',
        referrer: '',
        title: 'Cart',
        language: 'fr'
      },
      data: { ...cart, items: [] }
    });
    expect(second?.seq).toBe(2);
    expect(second?.id).not.toBe(event?.id);
    expect(Object.isFrozen(event)).toBe(true);
    expect(Object.isFrozen(event?.data.items)).toBe(true);
    expect(Object.isFrozen(event?.context)).toBe(true);
  });

  it('takes a given id (the order uuid for checkout_completed)', () => {
    const event = dispatchCommerceEvent('cart_viewed', cart, { id: 'order-uuid' });
    expect(event?.id).toBe('order-uuid');
  });

  it('delivers after the current task, not inside it', async () => {
    const got: AnyCommerceEvent[] = [];
    onCommerceEvent('cart_viewed', (e) => got.push(e));
    dispatchCommerceEvent('cart_viewed', cart);
    expect(got).toEqual([]);
    await settle();
    expect(names(got)).toEqual(['cart_viewed']);
  });

  it('runs each listener in its own task', async () => {
    const order: string[] = [];
    onCommerceEvent('cart_viewed', () => {
      order.push('first');
      queueMicrotask(() => order.push('first, microtask'));
    });
    onCommerceEvent('cart_viewed', () => order.push('second'));
    dispatchCommerceEvent('cart_viewed', cart);
    await settle();
    // In one task, the microtask would run after "second"
    expect(order).toEqual(['first', 'first, microtask', 'second']);
  });

  it('a listener that throws does not stop the others, and is logged', async () => {
    const got: string[] = [];
    onCommerceEvent('cart_viewed', () => {
      throw new Error('pixel broke');
    });
    onCommerceEvent('cart_viewed', () => got.push('second'));
    dispatchCommerceEvent('cart_viewed', cart);
    await settle();
    expect(got).toEqual(['second']);
    expect(consoleError).toHaveBeenCalledWith(
      'A "cart_viewed" commerce event listener failed',
      expect.objectContaining({ message: 'pixel broke' })
    );
  });

  it("'*' receives every event; a name receives only its own", async () => {
    const all: AnyCommerceEvent[] = [];
    const started: AnyCommerceEvent[] = [];
    onCommerceEvent('*', (e) => all.push(e));
    onCommerceEvent('checkout_started', (e) => started.push(e));
    dispatchCommerceEvent('cart_viewed', cart);
    dispatchCommerceEvent('checkout_started', cart);
    await settle();
    expect(names(all)).toEqual(['cart_viewed', 'checkout_started']);
    expect(names(started)).toEqual(['checkout_started']);
  });

  it('replays the earlier events to a late listener, marked replayed', async () => {
    dispatchCommerceEvent('cart_viewed', cart);
    dispatchCommerceEvent('checkout_started', cart);
    await settle();

    const late: AnyCommerceEvent[] = [];
    onCommerceEvent('*', (e) => late.push(e));
    await settle();
    expect(late.map((e) => [e.name, e.seq, e.replayed])).toEqual([
      ['cart_viewed', 1, true],
      ['checkout_started', 2, true]
    ]);

    dispatchCommerceEvent('cart_viewed', cart);
    await settle();
    expect(late.map((e) => [e.seq, e.replayed])).toEqual([
      [1, true],
      [2, true],
      [3, false]
    ]);
  });

  it('replay: false receives only later events', async () => {
    dispatchCommerceEvent('cart_viewed', cart);
    const got: AnyCommerceEvent[] = [];
    onCommerceEvent('cart_viewed', (e) => got.push(e), { replay: false });
    dispatchCommerceEvent('cart_viewed', cart);
    await settle();
    expect(got.map((e) => e.seq)).toEqual([2]);
  });

  it('a listener added while an event waits for delivery gets it once', async () => {
    const early: number[] = [];
    const late: number[] = [];
    onCommerceEvent('cart_viewed', (e) => early.push(e.seq));
    dispatchCommerceEvent('cart_viewed', cart);
    onCommerceEvent('cart_viewed', (e) => late.push(e.seq));
    await settle();
    expect(early).toEqual([1]);
    expect(late).toEqual([1]);
  });

  it('keeps the last 50 events for replay', async () => {
    for (let i = 0; i < 60; i += 1) {
      dispatchCommerceEvent('cart_viewed', cart);
    }
    const got: number[] = [];
    onCommerceEvent('cart_viewed', (e) => got.push(e.seq));
    // 50 deliveries, one task each, outlast settle(): deliver them now
    flushCommerceEvents();
    expect(got).toHaveLength(50);
    expect(got[0]).toBe(11);
    expect(got[49]).toBe(60);
  });

  it('unsubscribing stops delivery, even of an event already queued', async () => {
    const got: number[] = [];
    const stop = onCommerceEvent('cart_viewed', (e) => got.push(e.seq));
    dispatchCommerceEvent('cart_viewed', cart);
    stop();
    dispatchCommerceEvent('cart_viewed', cart);
    await settle();
    expect(got).toEqual([]);
  });

  it('delivers pending events at once when the page is left, or on flush', async () => {
    const got: number[] = [];
    onCommerceEvent('cart_viewed', (e) => got.push(e.seq));
    dispatchCommerceEvent('cart_viewed', cart);
    window.dispatchEvent(new window.Event('pagehide'));
    expect(got).toEqual([1]);

    dispatchCommerceEvent('cart_viewed', cart);
    flushCommerceEvents();
    expect(got).toEqual([1, 2]);
    // Nothing is delivered twice afterwards
    await settle();
    expect(got).toEqual([1, 2]);
  });

  it('is reachable from window.evershop for scripts outside the bundle', async () => {
    dispatchCommerceEvent('cart_viewed', cart);
    const api = (window as unknown as {
      evershop: { onCommerceEvent: typeof onCommerceEvent };
    }).evershop;
    const got: string[] = [];
    api.onCommerceEvent('cart_viewed', (e) => got.push(e.name), {
      consent: ['analytics']
    });
    await settle();
    expect(got).toEqual(['cart_viewed']);
  });
});
