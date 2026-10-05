import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

/**
 * ProductList decides whether its cards offer "Add to Cart" (theme-lab FINDINGS #49). It does by
 * default, so the homepage "Featured items" widget, which never passed the prop, has the button like
 * the listing pages do, and a theme changes it by overriding this one component. The button needs a
 * CartProvider (`AddToCart` throws without one) and a widget can sit above the provider, so it is
 * offered only where a cart exists.
 */
let cart: unknown;
jest.unstable_mockModule('@components/frontStore/cart/CartContext.js', () => ({
  useOptionalCartState: () => cart,
  useCartState: () => {
    if (!cart) throw new Error('useCartState must be used within a CartProvider');
    return cart;
  },
  useCartDispatch: () => {
    if (!cart) throw new Error('useCartDispatch must be used within a CartProvider');
    return { clearError() {}, addItem: async () => undefined };
  }
}));

const { AppProvider } = await import('@components/common/context/app.js');
const { ProductList } = await import('../../ProductList.js');
const { hasVariants } = await import('../../ProductListAddToCart.js');

const state = {
  config: { catalog: { imageDimensions: { width: 800, height: 1000 } }, pageMeta: { route: { id: 'homepage' } } },
  widgets: [],
  propsMap: {}
} as unknown as React.ComponentProps<typeof AppProvider>['value'];

const product = (i: number) => ({
  productId: i,
  uuid: `u-${i}`,
  name: `Dress ${i}`,
  sku: `SKU-${i}`,
  description: [],
  url: `/dress-${i}`,
  price: { regular: { value: 100, text: '$100.00' }, special: { value: 100, text: '$100.00' } },
  inventory: { isInStock: true }
});
const html = (props: Record<string, unknown> = {}) =>
  renderToStaticMarkup(
    <AppProvider value={state}>
      <ProductList products={[product(1), product(2)] as never} {...props} />
    </AppProvider>
  );
const buttons = (markup: string) => (markup.match(/Add to Cart/g) ?? []).length;

describe('ProductList and "Add to Cart"', () => {
  beforeEach(() => {
    cart = { data: { items: [] }, loading: false };
  });

  it('offers it on every card by default', () => {
    expect(buttons(html())).toBe(2);
  });

  it('offers it in the list layout too (the card has a second code path for it)', () => {
    expect(buttons(html({ layout: 'list' }))).toBe(2);
  });

  it('lets a caller switch it off for one list', () => {
    const markup = html({ showAddToCart: false });
    expect(buttons(markup)).toBe(0);
    expect(markup).toContain('Dress 1');
  });

  it('is not offered, and nothing throws, where there is no cart provider', () => {
    cart = undefined;
    expect(() => html()).not.toThrow();
    const markup = html();
    expect(buttons(markup)).toBe(0);
    expect(markup).toContain('Dress 1');
  });

  it('is not offered outside a cart even when a caller asks for it', () => {
    cart = undefined;
    expect(buttons(html({ showAddToCart: true }))).toBe(0);
  });
});

/**
 * Out of stock, the button used to stay "Add to Cart" and just go grey. It says "Sold out" now, the word the
 * product page's own disabled button uses (the `Sold out` key is already translated in every locale).
 */
describe('a product that is out of stock', () => {
  const soldOut = (i: number) => ({ ...product(i), inventory: { isInStock: false } });
  const list = (products: unknown[], props: Record<string, unknown> = {}) =>
    renderToStaticMarkup(
      <AppProvider value={state}>
        <ProductList products={products as never} {...props} />
      </AppProvider>
    );
  const soldOutButtons = (markup: string) => markup.match(/<button[^>]*disabled[^>]*>Sold out<\/button>/g) ?? [];

  beforeEach(() => {
    cart = { data: { items: [] }, loading: false };
  });

  it('says so on its disabled button instead of "Add to Cart"', () => {
    const markup = list([soldOut(1)]);
    expect(soldOutButtons(markup)).toHaveLength(1);
    expect(buttons(markup)).toBe(0);
  });

  it('leaves the products that are in stock as they were', () => {
    const markup = list([product(1), soldOut(2)]);
    expect(buttons(markup)).toBe(1);
    expect(soldOutButtons(markup)).toHaveLength(1);
  });

  it('does the same in the list layout', () => {
    expect(soldOutButtons(list([soldOut(1)], { layout: 'list' }))).toHaveLength(1);
  });

  it('keeps "Select options" for a product with variants, whose other variants may be in stock', () => {
    const markup = list([{ ...soldOut(1), variantGroupId: '7' }]);
    expect(markup).toContain('Select options');
    expect(markup).not.toContain('Sold out');
  });
});

/**
 * A product with variants (it belongs to a variant group) cannot be added from a card: the customer has
 * to choose colour, size... and the card cannot ask. It links to the product page instead, and says so.
 */
describe('a product with variants', () => {
  const configurable = (i: number, extra: Record<string, unknown> = {}) => ({ ...product(i), variantGroupId: '7', ...extra });
  const list = (products: unknown[], props: Record<string, unknown> = {}) =>
    renderToStaticMarkup(
      <AppProvider value={state}>
        <ProductList products={products as never} {...props} />
      </AppProvider>
    );
  const optionLinks = (markup: string) => (markup.match(/Select options/g) ?? []).length;

  beforeEach(() => {
    cart = { data: { items: [] }, loading: false };
  });

  it('links to its page instead of offering to add it', () => {
    const markup = list([configurable(1)]);
    expect(markup).toMatch(/<a href="\/dress-1" data-slot="button" class="[^"]*">Select options<\/a>/);
    expect(buttons(markup)).toBe(0);
  });

  it('leaves the simple products beside it with "Add to Cart"', () => {
    const markup = list([product(1), configurable(2)]);
    expect(buttons(markup)).toBe(1);
    expect(optionLinks(markup)).toBe(1);
  });

  it('does the same in the list layout', () => {
    const markup = list([configurable(1)], { layout: 'list' });
    expect(optionLinks(markup)).toBe(1);
    expect(buttons(markup)).toBe(0);
  });

  it('is styled like the button it replaces, including the width the card asks for', () => {
    const link = /data-slot="button" class="([^"]*)"/.exec(list([configurable(1)]));
    expect(link).not.toBeNull();
    expect(link![1].split(/\s+/)).toEqual(expect.arrayContaining(['w-full', 'bg-primary', 'inline-flex']));
  });

  it('is not offered when the list switches the action off, or where there is no cart', () => {
    expect(optionLinks(list([configurable(1)], { showAddToCart: false }))).toBe(0);
    cart = undefined;
    expect(optionLinks(list([configurable(1)]))).toBe(0);
  });

  it('has nothing to link to without a page, and does not add the variant instead', () => {
    const markup = list([configurable(1, { url: undefined })]);
    expect(optionLinks(markup)).toBe(0);
    expect(buttons(markup)).toBe(0);
  });
});

describe('hasVariants', () => {
  it('follows the rule the product resolver uses: a variant group id, anything but empty', () => {
    expect(hasVariants({ variantGroupId: '12' })).toBe(true);
    expect(hasVariants({ variantGroupId: 12 })).toBe(true);
    for (const none of [null, undefined, 0, '']) {
      expect(hasVariants({ variantGroupId: none as never })).toBe(false);
    }
    expect(hasVariants({})).toBe(false);
  });
});
