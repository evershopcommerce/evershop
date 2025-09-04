import Area from '@components/common/Area.js';
import Button from '@components/common/Button.js';
import { useCartState } from '@components/common/context/cart.js';
import { CartItems } from '@components/frontStore/CartItems.js';
import { CartTotalSummary } from '@components/frontStore/CartTotalSummary.js';
import { ShoppingCartEmpty } from '@components/frontStore/ShoppingCartEmpty.js';
import React from 'react';
import { _ } from '../../../../../lib/locale/translate/_.js';

const Title: React.FC<{ title: string }> = ({ title }) => {
  return (
    <div className="mb-7 text-center shopping-cart-header">
      <h1 className="shopping-cart-title mb-2">{title}</h1>
      <a href="/" className="underline">
        {_('Continue Shopping')}
      </a>
    </div>
  );
};
interface ShoppingCartProps {
  setting: {
    priceIncludingTax: boolean;
  };
  checkoutUrl: string;
}
export default function ShoppingCart({
  setting,
  checkoutUrl
}: ShoppingCartProps) {
  const { data: cart } = useCartState();
  return (
    <div className="cart page-width">
      {cart.items.length > 0 ? (
        <>
          <Title title={_('Shopping Cart')} />
          <div className="grid gap-10 grid-cols-1 md:grid-cols-4">
            <div className="col-span-1 md:col-span-3">
              <Area id="shoppingCartBeforeItems" noOuter />
              <CartItems productPriceInclTax={setting.priceIncludingTax} />
              <Area id="shoppingCartAfterItems" noOuter />
            </div>
            <div className="col-span-1 md:col-span-1">
              <Area id="shoppingCartBeforeSummary" noOuter />
              <div className="grid grid-cols-1 gap-5 cart-summary">
                <h4>{_('Order summary')}</h4>
                <CartTotalSummary
                  showPriceIncludingTax={setting.priceIncludingTax}
                />
              </div>
              <Area id="shoppingCartBeforeCheckoutButton" noOuter />
              <div className="shopping-cart-checkout-btn flex justify-between mt-5">
                <Button
                  url={checkoutUrl}
                  title={_('CHECKOUT')}
                  variant="primary"
                />
              </div>
              <Area id="shoppingCartAfterSummary" noOuter />
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
    setting {
      priceIncludingTax
    }
    checkoutUrl: url(routeId: "checkout")
  }
`;
