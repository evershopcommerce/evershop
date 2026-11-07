import { describe, expect, it } from '@jest/globals';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import CartRecoverConfirm, {
  layout,
  query
} from '../../pages/frontStore/cartRecoverConfirm/CartRecoverConfirm.js';

/**
 * The `/cart/recover` page: for a valid link, a plain form whose button
 * POSTs back to the page (opening the link changes nothing); otherwise a
 * message and a way back to the shop.
 */
describe('CartRecoverConfirm', () => {
  it('a valid link: the button, in a form that POSTs to the same page', () => {
    const html = renderToStaticMarkup(<CartRecoverConfirm cartRecoveryStatus="ready" homeUrl="/" cartUrl="/cart" />);
    expect(html).toContain('Restore your cart');
    expect(html).toMatch(/<form[^>]*method="post"[^>]*>/);
    expect(html).not.toMatch(/<form[^>]*action=/);
    expect(html).toMatch(/<button[^>]*type="submit"[^>]*>Restore my cart<\/button>/);
  });

  it("lists the saved cart's products: name, options, quantity, line total; centered page", () => {
    const items = [
      {
        cartItemId: '1',
        productName: 'Ceramic Coffee Cup - White',
        thumbnail: null,
        qty: 2,
        variantOptions: [{ optionId: 3, attributeName: 'Color', optionText: 'White' }],
        lineTotal: { text: '$30.00' },
        lineTotalInclTax: { text: '$33.00' }
      }
    ];
    const html = renderToStaticMarkup(
      <CartRecoverConfirm cartRecoveryStatus="ready" cartRecoveryItems={items} homeUrl="/" cartUrl="/cart" />
    );
    expect(html).toContain('Ceramic Coffee Cup - White');
    expect(html).toContain('Color: White');
    expect(html).toMatch(/Qty<!-- -->: <!-- -->2|Qty: 2/);
    expect(html).toContain('$30.00');
    expect(html).toMatch(/class="cart-recover [^"]*text-center/);
    // The list comes before the button
    expect(html.indexOf('Ceramic Coffee Cup')).toBeLessThan(html.indexOf('Restore my cart</button>'));
  });

  it('no products to list: no empty list, the button stays', () => {
    const html = renderToStaticMarkup(<CartRecoverConfirm cartRecoveryStatus="ready" cartRecoveryItems={[]} homeUrl="/" cartUrl="/cart" />);
    expect(html).not.toContain('cart-recover__items');
    expect(html).toContain('Restore my cart</button>');
  });

  it('a link used already: the message and a link to the cart, no form', () => {
    const html = renderToStaticMarkup(<CartRecoverConfirm cartRecoveryStatus="restored" homeUrl="/" cartUrl="/cart" />);
    expect(html).toContain('This cart was already restored');
    expect(html).toMatch(/<a[^>]*href="\/cart"[^>]*>Go to your cart<\/a>/);
    expect(html).not.toContain('<form');
  });

  it('a link that does not work: the message and a link to the shop, no form', () => {
    for (const status of ['invalid', null] as const) {
      const html = renderToStaticMarkup(<CartRecoverConfirm cartRecoveryStatus={status} homeUrl="/fr/" cartUrl="/fr/cart" />);
      expect(html).toContain('This cart link is no longer valid');
      expect(html).toContain('href="/fr/"');
      expect(html).not.toContain('<form');
    }
  });

  it('sits in the content area and asks for its state and the home URL', () => {
    expect(layout).toEqual({ areaId: 'content', sortOrder: 10 });
    expect(query).toContain('cartRecoveryStatus');
    expect(query).toMatch(/cartRecoveryItems\s*\{[^}]*productName/);
    expect(query).toMatch(/homeUrl:\s*url\(routeId:\s*"homepage"\)/);
    expect(query).toMatch(/cartUrl:\s*url\(routeId:\s*"cart"\)/);
  });
});
