import Area from '@components/common/Area.js';
import { Button } from '@components/common/ui/Button.js';
import { CartTotalSummary } from '@components/frontStore/cart/CartTotalSummary.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

/**
 * Cart page block: the order summary card (totals, checkout button, continue
 * link) with the `shoppingCartBeforeSummary`, `shoppingCartBeforeCheckoutButton`
 * and `shoppingCartAfterSummary` Areas. A page component rather than markup
 * inside the `ShoppingCart` shell so a theme can move it from `layouts.json`.
 * Fetches the checkout URL with its own query.
 */
export default function CartSummary({ checkoutUrl }: { checkoutUrl: string }): React.ReactElement {
  return (
    <>
      <Area id="shoppingCartBeforeSummary" noOuter />
      <div className="cart-summary rounded-lg border border-border bg-card p-6">
        <h2 className="h4">{_('Order summary')}</h2>
        <div className="mt-4">
          <CartTotalSummary />
        </div>
        <Area id="shoppingCartBeforeCheckoutButton" noOuter />
        <div className="shopping-cart-checkout-btn mt-6">
          <Button
            onClick={() => (window.location.href = checkoutUrl)}
            title={_('Proceed to checkout')}
            variant="default"
            size={'lg'}
            className={'w-full'}
          >
            {_('Proceed to checkout')}
          </Button>
        </div>
        <a
          href="/"
          className="mt-3 block text-center text-sm text-muted-foreground hover:text-foreground"
        >
          {_('Continue shopping')}
        </a>
        <Area id="shoppingCartAfterSummary" noOuter />
      </div>
    </>
  );
}

export const layout = {
  areaId: 'shoppingCartSummary',
  sortOrder: 10
};

export const query = `
  query Query {
    checkoutUrl: url(routeId: "checkout")
  }
`;
