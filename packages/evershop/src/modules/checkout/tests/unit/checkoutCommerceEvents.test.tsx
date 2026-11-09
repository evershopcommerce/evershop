import '../../../../components/frontStore/customer/address/tests/unit/domSetup.js';
import type { AnyCommerceEvent } from '@evershop/evershop/types/commerceEvents';
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

/**
 * The checkout's commerce events:
 * - `cart_viewed` (cart/CartViewedEvent.tsx) and `checkout_started`
 *   (checkout/CheckoutStartedEvent.tsx): once when the page is shown;
 * - `checkout_contact_info_submitted` for a logged-in customer
 *   (CheckoutStartedEvent.tsx): right after `checkout_started`, once per cart
 *   and customer in a browser session (a guest's comes from
 *   `CartContext.addContactInfo`);
 * - `payment_info_submitted` (CheckoutContext.checkout()): once the order is
 *   created with its payment method, not when the server refuses it;
 * - `checkout_completed` (checkoutSuccess/CheckoutCompletedEvent.tsx): once
 *   per order in a browser, with the order uuid as its id.
 */
const money = (value: number) => ({ value, text: String(value) });
const line = {
  uuid: 'line-1',
  productId: '12',
  variantGroupId: null,
  productSku: 'TEE',
  productName: 'Tee',
  qty: 2,
  thumbnail: null,
  productUrl: '/tee',
  finalPrice: money(10),
  finalPriceInclTax: money(12),
  lineTotal: money(20),
  lineTotalWithDiscount: money(18),
  variantOptions: []
};
const cart = {
  uuid: 'cart-1',
  currency: 'USD',
  coupon: 'TEN',
  totalQty: 2,
  items: [line],
  checkoutApi: '/api/carts/cart-1/checkout',
  availablePaymentMethods: [{ code: 'cod', name: 'Cash on Delivery' }],
  availableShippingMethods: [],
  errors: []
};
jest.unstable_mockModule('@components/frontStore/cart/CartContext.js', () => ({
  useCartState: () => ({ data: cart }),
  useCartDispatch: () => ({})
}));

const React = (await import('react')).default;
const { act } = await import('react');
const { createRoot } = await import('react-dom/client');
const { useForm } = await import('react-hook-form');
const { onCommerceEvent } = await import('../../../../components/common/commerceEvents.js');
const { CheckoutProvider, useCheckoutDispatch } = await import(
  '../../../../components/frontStore/checkout/CheckoutContext.js'
);
const { default: CartViewedEvent } = await import(
  '../../pages/frontStore/cart/CartViewedEvent.js'
);
const { default: CheckoutStartedEvent } = await import(
  '../../pages/frontStore/checkout/CheckoutStartedEvent.js'
);
const { default: CheckoutCompletedEvent } = await import(
  '../../pages/frontStore/checkoutSuccess/CheckoutCompletedEvent.js'
);

const settle = async () => {
  for (let i = 0; i < 10; i += 1) {
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
};

const order = (uuid: string, placed: boolean) => ({
  uuid,
  orderNumber: '10001',
  currency: 'USD',
  coupon: 'TEN',
  placedAt: placed ? { value: '2026-11-02T10:00:00Z' } : null,
  paymentStatus: { code: placed ? 'paid' : 'pending' },
  totalTaxAmount: money(3.6),
  shippingFeeExclTax: money(5),
  grandTotal: money(26.6),
  items: [line]
});

describe('checkout commerce events', () => {
  let container: HTMLElement;
  let root: ReturnType<typeof createRoot>;
  let events: AnyCommerceEvent[];
  let stop: () => void;
  const realFetch = globalThis.fetch;

  const render = async (node: React.ReactNode) => {
    await act(async () => {
      root.render(node);
    });
    await settle();
  };
  const remount = async (node: React.ReactNode) => {
    act(() => root.unmount());
    root = createRoot(container);
    await render(node);
  };

  beforeEach(() => {
    delete (window as unknown as Record<string, unknown>).__evershopCommerceEvents;
    window.localStorage.clear();
    window.sessionStorage.clear();
    events = [];
    stop = onCommerceEvent('*', (e) => events.push(e));
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    stop();
    act(() => root.unmount());
    container.remove();
    globalThis.fetch = realFetch;
  });

  it('cart_viewed and checkout_started: the cart, once per page', async () => {
    await render(
      <React.StrictMode>
        <CartViewedEvent />
        <CheckoutStartedEvent />
      </React.StrictMode>
    );
    expect(events.map((e) => e.name)).toEqual(['cart_viewed', 'checkout_started']);
    expect(events[1].data).toEqual({
      cartId: 'cart-1',
      currency: 'USD',
      value: 18,
      coupon: 'TEN',
      totalQty: 2,
      items: [
        {
          productId: 12,
          variantGroupId: null,
          sku: 'TEE',
          name: 'Tee',
          variant: undefined,
          qty: 2,
          price: 10,
          priceInclTax: 12,
          discount: 1,
          url: 'http://localhost/tee',
          image: undefined
        }
      ]
    });
  });

  describe('checkout_contact_info_submitted for a logged-in customer', () => {
    afterEach(() => {
      delete (cart as Record<string, unknown>).customerId;
    });

    it('right after checkout_started, with the cart and loggedIn, once per page', async () => {
      Object.assign(cart, { customerId: 7 });
      await render(
        <React.StrictMode>
          <CheckoutStartedEvent />
        </React.StrictMode>
      );
      expect(events.map((e) => e.name)).toEqual(['checkout_started', 'checkout_contact_info_submitted']);
      expect(events[1].data).toEqual({ ...events[0].data, loggedIn: true });
      expect(events[1].seq).toBeGreaterThan(events[0].seq);
    });

    it('a reload of the checkout: checkout_started only', async () => {
      Object.assign(cart, { customerId: 7 });
      await render(<CheckoutStartedEvent />);
      await remount(<CheckoutStartedEvent />);
      expect(events.map((e) => e.name)).toEqual([
        'checkout_started',
        'checkout_contact_info_submitted',
        'checkout_started'
      ]);
    });

    it('another customer on the same cart (a guest who logged in): published again', async () => {
      Object.assign(cart, { customerId: 7 });
      await render(<CheckoutStartedEvent />);
      Object.assign(cart, { customerId: 8 });
      await remount(<CheckoutStartedEvent />);
      expect(events.filter((e) => e.name === 'checkout_contact_info_submitted')).toHaveLength(2);
    });

    it('storage blocked: still published, on each checkout page', async () => {
      const blocked = () => {
        throw new Error('SecurityError');
      };
      const getItem = jest.spyOn(window.Storage.prototype, 'getItem').mockImplementation(blocked);
      const setItem = jest.spyOn(window.Storage.prototype, 'setItem').mockImplementation(blocked);
      try {
        Object.assign(cart, { customerId: 7 });
        await render(<CheckoutStartedEvent />);
        await remount(<CheckoutStartedEvent />);
        expect(events.filter((e) => e.name === 'checkout_contact_info_submitted')).toHaveLength(2);
      } finally {
        getItem.mockRestore();
        setItem.mockRestore();
      }
    });
  });

  describe('payment_info_submitted', () => {
    let dispatch: ReturnType<typeof useCheckoutDispatch>;
    function Probe() {
      dispatch = useCheckoutDispatch();
      return null;
    }
    function Checkout() {
      const form = useForm();
      return (
        <CheckoutProvider
          form={form}
          enableForm={() => undefined}
          disableForm={() => undefined}
          placeOrderApi="/api/orders"
          checkoutSuccessUrl="/checkout/success"
        >
          <Probe />
        </CheckoutProvider>
      );
    }
    const respond = (ok: boolean) => {
      globalThis.fetch = (async () => ({
        ok,
        json: async () =>
          ok ? { data: { uuid: 'order-1' } } : { error: { message: 'Card declined' } }
      })) as unknown as typeof fetch;
    };

    it('once the order is created, with the payment method', async () => {
      respond(true);
      await render(<Checkout />);
      await act(async () => {
        dispatch.updateCheckoutData({ paymentMethod: 'cod' });
        await dispatch.checkout();
      });
      await settle();
      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        name: 'payment_info_submitted',
        data: {
          paymentMethod: { code: 'cod', name: 'Cash on Delivery' },
          cartId: 'cart-1',
          value: 18
        }
      });
    });

    it('nothing when the server refuses the order', async () => {
      respond(false);
      await render(<Checkout />);
      await act(async () => {
        dispatch.updateCheckoutData({ paymentMethod: 'cod' });
        await dispatch.checkout().catch(() => undefined);
      });
      await settle();
      expect(events).toEqual([]);
    });
  });

  describe('checkout_completed', () => {
    it('the order, with its uuid as the event id', async () => {
      await render(<CheckoutCompletedEvent order={order('order-1', true)} />);
      expect(events).toHaveLength(1);
      expect(events[0].id).toBe('order-1');
      expect(events[0]).toMatchObject({
        name: 'checkout_completed',
        data: {
          orderId: 'order-1',
          orderNumber: '10001',
          placed: true,
          paymentStatus: 'paid',
          currency: 'USD',
          value: 18,
          tax: 3.6,
          shipping: 5,
          discount: 2,
          total: 26.6,
          coupon: 'TEN',
          items: [{ sku: 'TEE', qty: 2, price: 10, discount: 1 }]
        }
      });
    });

    it("rounds value and discount to the currency's minor unit", async () => {
      // Core keeps a discounted line at 4 decimals: 2 × 18.18 less 10 %
      const taxed = {
        ...line,
        finalPrice: money(18.18),
        lineTotal: money(36.36),
        lineTotalWithDiscount: money(32.7273)
      };
      await render(
        <CheckoutCompletedEvent order={{ ...order('order-4', true), items: [taxed, taxed] }} />
      );
      expect(events[0].data).toMatchObject({
        value: 65.45,
        discount: 7.27,
        items: [{ discount: 1.82 }, { discount: 1.82 }]
      });
    });

    it('once per order: a reload publishes nothing, another order does', async () => {
      await render(<CheckoutCompletedEvent order={order('order-1', true)} />);
      await remount(<CheckoutCompletedEvent order={order('order-1', true)} />);
      await remount(
        <React.StrictMode>
          <CheckoutCompletedEvent order={order('order-2', false)} />
        </React.StrictMode>
      );
      expect(events.map((e) => [e.id, (e.data as { placed: boolean }).placed])).toEqual([
        ['order-1', true],
        ['order-2', false]
      ]);
    });

    it('still publishes when storage is blocked', async () => {
      const getItem = jest
        .spyOn(window.localStorage.__proto__, 'getItem')
        .mockImplementation(() => {
          throw new Error('SecurityError');
        });
      try {
        await render(<CheckoutCompletedEvent order={order('order-3', true)} />);
        expect(events.map((e) => e.id)).toEqual(['order-3']);
      } finally {
        getItem.mockRestore();
      }
    });
  });
});
