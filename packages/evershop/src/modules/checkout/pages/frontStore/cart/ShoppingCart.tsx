import Area from '@components/common/Area.js';
import { Button } from '@components/common/ui/Button.js';
import { useCartState } from '@components/frontStore/cart/CartContext.js';
import { CartItems } from '@components/frontStore/cart/CartItems.js';
import { CartTotalSummary } from '@components/frontStore/cart/CartTotalSummary.js';
import { DefaultCartItemList } from '@components/frontStore/cart/DefaultCartItemList.js';
import { ShoppingCartEmpty } from '@components/frontStore/cart/ShoppingCartEmpty.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

// Re-skin (2026-07-10): left-aligned title + "N items" subtitle (reference,
// was centered "Shopping Cart" with a continue link below it).
const Title: React.FC<{ count: number }> = ({ count }) => {
  return (
    <div className="shopping-cart-header mb-8">
      <h1 className="shopping-cart-title text-3xl font-semibold tracking-tight">
        {_('Your cart')}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {_('${count} items in your cart', { count: count.toString() })}
      </p>
    </div>
  );
};
interface ShoppingCartProps {
  checkoutUrl: string;
}
export default function ShoppingCart({ checkoutUrl }: ShoppingCartProps) {
  const { data: cart } = useCartState();
  return (
    <div className="cart">
      {cart.items.length > 0 ? (
        <>
          <Title count={cart.items.length} />
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_360px]">
            <div>
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
            </div>
            <div className="h-fit">
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
