import '../../../../components/frontStore/customer/address/tests/unit/domSetup.js';
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

/**
 * `GoogleAnalytics.tsx` (storefront `body` area) sends the commerce events to
 * GA4 as its ecommerce events, through the `gtag()` the head script defines:
 * - only with a valid Measurement ID, and only when `gtag()` exists;
 * - events the page published before it subscribed are sent too (replay);
 * - one listener per page (React's development double mount would send
 *   every event twice);
 * - a reloaded order success page sends no second purchase: it follows
 *   `checkout_completed`, which comes once per order in a browser.
 */
const React = (await import('react')).default;
const { act } = await import('react');
const { createRoot } = await import('react-dom/client');
const { dispatchCommerceEvent, flushCommerceEvents } = await import(
  '../../../../components/common/commerceEvents.js'
);
const { default: GoogleAnalytics } = await import(
  '../../pages/frontStore/all/GoogleAnalytics.js'
);
const { default: CheckoutCompletedEvent } = await import(
  '../../../checkout/pages/frontStore/checkoutSuccess/CheckoutCompletedEvent.js'
);

type GaWindow = Window & Record<string, unknown>;
const w = window as unknown as GaWindow;

const settle = async () => {
  for (let i = 0; i < 10; i += 1) {
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  flushCommerceEvents();
};

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
  finalPriceInclTax: money(11),
  lineTotal: money(20),
  lineTotalWithDiscount: money(20),
  variantOptions: []
};
const order = {
  uuid: '6f1c2b4e-0000-4000-8000-000000000001',
  orderNumber: '10001',
  currency: 'USD',
  coupon: null,
  placedAt: { value: '2026-11-06T10:00:00Z' },
  paymentStatus: { code: 'pending' },
  totalTaxAmount: money(2),
  shippingFeeExclTax: money(5),
  grandTotal: money(27),
  items: [line]
};
const viewed = {
  currency: 'USD',
  value: 10,
  taxIncluded: false,
  items: [{ productId: 12, variantGroupId: null, sku: 'TEE', name: 'Tee', qty: 1, price: 10, discount: 0 }]
};

describe('GA4 events from the storefront', () => {
  let container: HTMLElement;
  let root: ReturnType<typeof createRoot>;
  let sent: unknown[][];

  /** A new page: a new bus and no listener yet; localStorage stays, as in a browser */
  const newPage = () => {
    delete w.__evershopCommerceEvents;
    delete w.__evershopGa4Events;
  };
  const render = async (node: React.ReactNode) => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
      root.render(node);
    });
    await settle();
  };
  const unmount = () => {
    act(() => root.unmount());
    container.remove();
  };

  beforeEach(() => {
    newPage();
    window.localStorage.clear();
    sent = [];
    w.gtag = (...args: unknown[]) => {
      sent.push(args);
    };
  });

  afterEach(() => {
    unmount();
    delete w.gtag;
  });

  const ga = (id: string | null = 'G-TEST123') => <GoogleAnalytics setting={{ gaMeasurementId: id }} />;

  it('sends the mapped events, including those from before it subscribed', async () => {
    dispatchCommerceEvent('product_viewed', viewed as never);
    await render(ga());
    dispatchCommerceEvent('coupon_applied', { coupon: 'TEN', cart: {} } as never);
    await settle();
    expect(sent).toEqual([
      [
        'event',
        'view_item',
        {
          currency: 'USD',
          value: 10,
          items: [{ item_id: 'TEE', item_name: 'Tee', price: 10, quantity: 1 }]
        }
      ]
    ]);
  });

  it.each([[null], [''], ['UA-12345-1'], ["G-1');alert(1)//"]])('nothing with the Measurement ID %j', async (id) => {
    dispatchCommerceEvent('product_viewed', viewed as never);
    await render(ga(id));
    expect(sent).toEqual([]);
    expect(w.__evershopGa4Events).toBeUndefined();
  });

  it('nothing when the head script did not run (no gtag)', async () => {
    delete w.gtag;
    dispatchCommerceEvent('product_viewed', viewed as never);
    await render(ga());
    expect(w.__evershopGa4Events).toBeUndefined();
  });

  it('one listener per page, also with React\'s development double mount', async () => {
    dispatchCommerceEvent('product_viewed', viewed as never);
    await render(
      <React.StrictMode>
        {ga()}
        {ga()}
      </React.StrictMode>
    );
    expect(sent).toHaveLength(1);
  });

  it('the success page reloaded: one purchase', async () => {
    const page = (
      <>
        <CheckoutCompletedEvent order={order as never} />
        {ga()}
      </>
    );
    await render(page);
    unmount();
    newPage();
    await render(page);

    const purchases = sent.filter((call) => call[1] === 'purchase');
    expect(purchases).toHaveLength(1);
    expect(purchases[0][2]).toMatchObject({
      transaction_id: '10001',
      currency: 'USD',
      value: 20,
      tax: 2,
      shipping: 5
    });
  });
});
