import Area from '@components/common/Area.js';
import Button from '@components/common/Button.js';
import { useCartState } from '@components/frontStore/cart/CartContext.js';
import { CartItems } from '@components/frontStore/cart/CartItems.js';
import { CartTotalSummary } from '@components/frontStore/cart/CartTotalSummary.js';
import { DefaultCartItemList } from '@components/frontStore/cart/DefaultCartItemList.js';
import { ShoppingCartEmpty } from '@components/frontStore/cart/ShoppingCartEmpty.js';
import { _ } from '@storefront/core/lib/locale/translate/_';
import React from 'react';

const Title: React.FC<{ title: string }> = ({ title }) => {
  return (
    <div className="mb-10 flex flex-wrap items-baseline justify-between gap-3 border-b border-divider pb-6 shopping-cart-header">
      <h1 className="shopping-cart-title">{title}</h1>
      <a
        href="/"
        className="text-[0.9375rem] font-medium text-textSubdued underline underline-offset-4 hover:text-accent"
      >
        {_('Continue Shopping')}
      </a>
    </div>
  );
};
interface ShoppingCartProps {
  checkoutUrl: string;
}
export default function ShoppingCart({ checkoutUrl }: ShoppingCartProps) {
  const { data: cart } = useCartState();
  return (
    <div className="cart page-width">
      {cart.items.length > 0 ? (
        <>
          <Title title={_('Shopping Cart')} />
          <div className="grid gap-10 grid-cols-1 md:grid-cols-4">
            <div className="col-span-1 md:col-span-3">
              <Area id="shoppingCartBeforeItems" noOuter />
              <CartItems>
                {({ items, showPriceIncludingTax, loading, onRemoveItem }) => (
                  <DefaultCartItemList
                    items={items}
                    showPriceIncludingTax={showPriceIncludingTax}
                    loading={loading}
                    onRemoveItem={onRemoveItem}
                  />
                )}
              </CartItems>
              <Area id="shoppingCartAfterItems" noOuter />
            </div>
            <div className="col-span-1 md:col-span-1">
              <div className="surface-card sticky top-24 p-6">
                <Area id="shoppingCartBeforeSummary" noOuter />
                <div className="grid grid-cols-1 gap-5 cart-summary">
                  <h4>{_('Order summary')}</h4>
                  <CartTotalSummary />
                </div>
                <Area id="shoppingCartBeforeCheckoutButton" noOuter />
                <div className="shopping-cart-checkout-btn mt-6">
                  <Button
                    url={checkoutUrl}
                    title={_('CHECKOUT')}
                    variant="primary"
                    className="w-full py-4"
                  />
                </div>
                <Area id="shoppingCartAfterSummary" noOuter />
              </div>
            </div>
          </div>
        </>
      ) : (
        <ShoppingCartEmpty />
      )}
    </div>
  );
}

export const layout = {
  areaId: 'content',
  sortOrder: 10
};

export const query = `
  query Query {
    checkoutUrl: url(routeId: "checkout")
  }
`;
