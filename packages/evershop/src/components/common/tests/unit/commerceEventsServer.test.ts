import { describe, it, expect } from '@jest/globals';

/**
 * On the server (no `window`) the commerce event bus does nothing: a page
 * component that publishes in render, or imports it, must not fail in SSR.
 */
const { dispatchCommerceEvent, onCommerceEvent, flushCommerceEvents } =
  await import('../../commerceEvents.js');

describe('commerce event bus on the server', () => {
  it('publishes nothing and subscribes to nothing', () => {
    expect(typeof window).toBe('undefined');
    expect(
      dispatchCommerceEvent('cart_viewed', {
        cartId: 'c',
        currency: 'USD',
        value: 0,
        totalQty: 0,
        items: []
      })
    ).toBeUndefined();
    const stop = onCommerceEvent('cart_viewed', () => undefined);
    expect(typeof stop).toBe('function');
    expect(() => stop()).not.toThrow();
    expect(() => flushCommerceEvents()).not.toThrow();
  });
});
