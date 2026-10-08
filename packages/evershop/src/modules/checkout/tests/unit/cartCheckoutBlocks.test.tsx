import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { layout as cartItems } from '../../pages/frontStore/cart/CartItems.js';
import { layout as cartSummary, query as cartSummaryQuery } from '../../pages/frontStore/cart/CartSummary.js';
import { layout as cartTitle } from '../../pages/frontStore/cart/CartTitle.js';
import { layout as contact } from '../../pages/frontStore/checkout/CheckoutContact.js';
import { layout as payment } from '../../pages/frontStore/checkout/CheckoutPayment.js';
import { layout as placeOrder } from '../../pages/frontStore/checkout/CheckoutPlaceOrder.js';
import { layout as shipment } from '../../pages/frontStore/checkout/CheckoutShipment.js';
import CheckoutShippingNote, {
  layout as shippingNote,
  query as shippingNoteQuery
} from '../../pages/frontStore/checkout/CheckoutShippingNote.js';
import { layout as summary, query as summaryQuery } from '../../pages/frontStore/checkout/CheckoutSummary.js';

// The cart and checkout shells own the grid, the form and the provider; these
// blocks register into their Areas so `themes/<id>/layouts.json` can move them.
describe('cart page blocks', () => {
  it('keep the default slots the shell had when the pieces were inline', () => {
    expect(cartTitle).toEqual({ areaId: 'shoppingCartHeader', sortOrder: 10 });
    expect(cartItems).toEqual({ areaId: 'shoppingCartItems', sortOrder: 10 });
    expect(cartSummary).toEqual({ areaId: 'shoppingCartSummary', sortOrder: 10 });
  });

  it('fetch the checkout URL from the summary block itself, not from the shell', () => {
    expect(cartSummaryQuery).toContain('checkoutUrl: url(routeId: "checkout")');
  });
});

describe('checkout page blocks', () => {
  it('keep the default slots and order the shell had when the steps were inline', () => {
    expect(contact).toEqual({ areaId: 'checkoutSteps', sortOrder: 10 });
    expect(shipment).toEqual({ areaId: 'checkoutSteps', sortOrder: 20 });
    expect(payment).toEqual({ areaId: 'checkoutSteps', sortOrder: 30 });
    expect(shippingNote).toEqual({ areaId: 'checkoutSteps', sortOrder: 40 });
    expect(placeOrder).toEqual({ areaId: 'checkoutSteps', sortOrder: 50 });
    expect(summary).toEqual({ areaId: 'checkoutSummary', sortOrder: 10 });
  });

  it('read the shipping-note setting through their own queries', () => {
    expect(shippingNoteQuery).toContain('showShippingNote');
    expect(summaryQuery).toContain('showShippingNote');
  });

  it('render no mobile note when the setting is off or missing', () => {
    expect(renderToStaticMarkup(<CheckoutShippingNote />)).toBe('');
    expect(renderToStaticMarkup(<CheckoutShippingNote setting={{ showShippingNote: false }} />)).toBe('');
  });
});
