import '../../../frontStore/customer/address/tests/unit/domSetup.js';
import type {
  AnyCommerceEvent,
  CommerceCart
} from '@evershop/evershop/types/commerceEvents';
import { jest, describe, it, expect } from '@jest/globals';
import { COMMERCE_EVENT_STUB } from '../../react/server/commerceEventStub.js';

/**
 * How the bus starts, and how it schedules:
 * - the head stub (`COMMERCE_EVENT_STUB`) queues `onCommerceEvent` calls
 *   until the bus loads, and the bus takes them over; a script in the head
 *   then gets the page-load events live;
 * - the bus exists once its module is evaluated, before any event;
 * - with the Prioritized Task Scheduling API, listeners run in
 *   background-priority tasks;
 * - a copy that finds the state of another version forwards to that bus;
 * - event ids are version 4 uuids, also without `crypto.randomUUID`.
 */
type Win = Record<string, any>;
const win = window as unknown as Win;

const priorities: string[] = [];
(globalThis as Win).scheduler = {
  postTask(task: () => void, options: { priority: string }) {
    priorities.push(options.priority);
    return new Promise((resolve) => {
      setTimeout(() => resolve(task()), 0);
    });
  }
};

// The head stub runs first, and a head script subscribes through it
new Function(COMMERCE_EVENT_STUB)();
const fromHead: AnyCommerceEvent[] = [];
const stoppedEarly: AnyCommerceEvent[] = [];
const stopHead = win.evershop.onCommerceEvent('*', (e: AnyCommerceEvent) =>
  fromHead.push(e)
);
win.evershop.onCommerceEvent('*', (e: AnyCommerceEvent) => stoppedEarly.push(e))();
const queuedBeforeLoad = win.evershop.commerceEventQueue.length;

const { dispatchCommerceEvent, onCommerceEvent, flushCommerceEvents } = await import(
  '../../commerceEvents.js'
);

const cart: CommerceCart = {
  cartId: 'cart-1',
  currency: 'USD',
  value: 20,
  totalQty: 2,
  items: []
};

const settle = async () => {
  for (let i = 0; i < 10; i += 1) {
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
};

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('commerce event bus start', () => {
  it('exists as soon as its module is evaluated, before any event', () => {
    expect(win.__evershopCommerceEvents).toMatchObject({ version: 1, seq: 0 });
    expect(win.evershop.onCommerceEvent).toBe(onCommerceEvent);
    expect(win.evershop.commerceEventQueue).toBeUndefined();
    expect(queuedBeforeLoad).toBe(2);
  });

  it('takes over the calls the head stub queued; they get events live', async () => {
    dispatchCommerceEvent('cart_viewed', cart);
    await settle();
    expect(fromHead.map((e) => [e.name, e.replayed])).toEqual([
      ['cart_viewed', false]
    ]);
    expect(stoppedEarly).toEqual([]);
  });

  it("the stub's stop function works after the take-over", async () => {
    stopHead();
    dispatchCommerceEvent('checkout_started', cart);
    await settle();
    expect(fromHead.map((e) => e.name)).toEqual(['cart_viewed']);
  });

  it('runs listeners in background-priority tasks', async () => {
    priorities.length = 0;
    onCommerceEvent('cart_viewed', () => undefined, { replay: false });
    onCommerceEvent('cart_viewed', () => undefined, { replay: false });
    dispatchCommerceEvent('cart_viewed', cart);
    await settle();
    expect(priorities.length).toBeGreaterThanOrEqual(2);
    expect(new Set(priorities)).toEqual(new Set(['background']));
  });

  it('gives a version 4 uuid, also without crypto.randomUUID', () => {
    expect(dispatchCommerceEvent('cart_viewed', cart)?.id).toMatch(UUID_V4);
    Object.defineProperty(globalThis.crypto, 'randomUUID', {
      value: undefined,
      configurable: true
    });
    try {
      const ids = [1, 2, 3].map(
        () => dispatchCommerceEvent('cart_viewed', cart)?.id
      );
      ids.forEach((id) => expect(id).toMatch(UUID_V4));
      expect(new Set(ids).size).toBe(3);
    } finally {
      delete (globalThis.crypto as unknown as Win).randomUUID;
    }
  });

  it("forwards to the bus of another version that loaded first, and says so once", () => {
    const own = win.__evershopCommerceEvents;
    const consoleWarn = jest
      .spyOn(console, 'warn')
      .mockImplementation(() => undefined);
    const stop = jest.fn();
    const api = {
      dispatch: jest.fn(() => ({ id: 'from-v2' })),
      on: jest.fn(() => stop),
      flush: jest.fn()
    };
    const handler = () => undefined;
    win.__evershopCommerceEvents = { version: 2, api };
    try {
      expect(
        dispatchCommerceEvent('cart_viewed', cart, { id: 'order-1' })
      ).toEqual({ id: 'from-v2' });
      expect(api.dispatch).toHaveBeenCalledWith('cart_viewed', cart, {
        id: 'order-1'
      });
      onCommerceEvent('cart_viewed', handler, { replay: false })();
      expect(api.on).toHaveBeenCalledWith('cart_viewed', handler, {
        replay: false
      });
      expect(stop).toHaveBeenCalledTimes(1);
      flushCommerceEvents();
      expect(api.flush).toHaveBeenCalledTimes(1);

      // A bus without the shared functions: nothing to forward to
      win.__evershopCommerceEvents = { version: 3 };
      expect(dispatchCommerceEvent('cart_viewed', cart)).toBeUndefined();
      expect(onCommerceEvent('cart_viewed', handler)()).toBeUndefined();

      expect(consoleWarn).toHaveBeenCalledTimes(1);
      expect(String(consoleWarn.mock.calls[0][0])).toContain(
        "version 1 uses version 2's bus"
      );
    } finally {
      win.__evershopCommerceEvents = own;
      consoleWarn.mockRestore();
    }
  });
});
