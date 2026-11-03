import '../../../../components/frontStore/customer/address/tests/unit/domSetup.js';
import type { AnyCommerceEvent } from '@evershop/evershop/types/commerceEvents';
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

/**
 * `product_viewed` (productView/ProductViewedEvent.tsx): once when the
 * product page shows a product, again when a variant switch loads another
 * product (new page data, no page load), never twice for the same one, also
 * not under React's development double mount.
 */
const React = (await import('react')).default;
const { act } = await import('react');
const { createRoot } = await import('react-dom/client');
const { AppProvider } = await import('../../../../components/common/context/app.js');
const { onCommerceEvent } = await import('../../../../components/common/commerceEvents.js');
const { default: ProductViewedEvent } = await import(
  '../../pages/frontStore/productView/ProductViewedEvent.js'
);

const appState = (priceIncludingTax: boolean) =>
  ({
    config: { tax: { priceIncludingTax }, pageMeta: { route: { id: 'productView' } } },
    widgets: [],
    propsMap: {}
  }) as unknown as React.ComponentProps<typeof AppProvider>['value'];

const red = {
  productId: 7,
  uuid: 'p-red',
  sku: 'TEE-RED',
  name: 'Tee, red',
  url: '/tee-red',
  variantGroupId: '3',
  price: { regular: { value: 24.5 } },
  image: { url: '/assets/tee-red.jpg' },
  category: { name: 'Tees' }
};
const blue = { ...red, productId: 8, uuid: 'p-blue', sku: 'TEE-BLUE', url: '/tee-blue' };

const settle = async () => {
  for (let i = 0; i < 10; i += 1) {
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
};

describe('product_viewed', () => {
  let container: HTMLElement;
  let root: ReturnType<typeof createRoot>;
  let events: AnyCommerceEvent[];
  let stop: () => void;

  const render = async (
    product: typeof red | null,
    priceIncludingTax = false,
    strict = false
  ) => {
    const tree = (
      <AppProvider value={appState(priceIncludingTax)}>
        <ProductViewedEvent product={product} setting={{ storeCurrency: 'EUR' }} />
      </AppProvider>
    );
    await act(async () => {
      root.render(strict ? <React.StrictMode>{tree}</React.StrictMode> : tree);
    });
    await settle();
  };

  beforeEach(() => {
    delete (window as unknown as Record<string, unknown>).__evershopCommerceEvents;
    events = [];
    stop = onCommerceEvent('product_viewed', (e) => events.push(e));
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    stop();
    act(() => root.unmount());
    container.remove();
  });

  it('publishes the product as one item, with absolute URLs', async () => {
    await render(red);
    expect(events).toHaveLength(1);
    expect(events[0].data).toEqual({
      currency: 'EUR',
      value: 24.5,
      taxIncluded: false,
      items: [
        {
          productId: 7,
          variantGroupId: 3,
          sku: 'TEE-RED',
          name: 'Tee, red',
          qty: 1,
          price: 24.5,
          discount: 0,
          url: 'http://localhost/tee-red',
          image: 'http://localhost/assets/tee-red.jpg',
          categories: ['Tees']
        }
      ]
    });
  });

  it("names the variant by the product's own options in its group", async () => {
    const variantGroup = {
      variantAttributes: [
        {
          options: [
            { optionText: 'Red', productId: 7 },
            { optionText: 'Blue', productId: 8 }
          ]
        },
        {
          options: [
            { optionText: 'M', productId: 7 },
            { optionText: 'M', productId: 8 }
          ]
        }
      ]
    };
    await render({ ...red, variantGroup } as typeof red);
    await render({ ...blue, variantGroup } as typeof red);
    expect(
      events.map((e) => (e.data as { items: Array<{ variant?: string }> }).items[0].variant)
    ).toEqual(['Red / M', 'Blue / M']);
  });

  it('says when the catalog price includes tax', async () => {
    await render(red, true);
    expect(events[0].data).toMatchObject({ taxIncluded: true });
  });

  it('again on a variant switch, not on a re-render of the same product', async () => {
    await render(red);
    await render({ ...red });
    await render(blue);
    expect(events.map((e) => (e.data as { items: Array<{ sku: string }> }).items[0].sku)).toEqual([
      'TEE-RED',
      'TEE-BLUE'
    ]);
  });

  it('once under React StrictMode (development double mount)', async () => {
    await render(red, false, true);
    expect(events).toHaveLength(1);
  });

  it('nothing without a product', async () => {
    await render(null);
    expect(events).toEqual([]);
  });
});
