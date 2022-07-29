import React from 'react';
import Area from '../../../../../lib/components/Area';
import { get } from '../../../../../lib/util/get';
import { useAppState } from '../../../../../lib/context/app';

function Title({ text }) {
  const items = get(useAppState(), 'cart.items', []);
  if (items.length <= 0) return null;

  return (
    <div className="mb-3 text-center shopping-cart-heading">
      <h1 className="shopping-cart-title mb-05">{text}</h1>
      <a href="/" className="underline">Continue shopping</a>
    </div>
  );
}
export default function CartLayout({ text }) {

  return (
    <div>
      <div className="cart page-width">
        <Area
          id="shoppingCartTop"
          className="cart-page-top sdsd"
          coreComponents={[
            {
              component: { default: Title },
              props: { text: text || 'Shopping cart' },
              sortOrder: 10,
              id: 'shoppingCartTitle'
            }
          ]}
        />
        <div className="cart-page-middle">
          <div className="grid gap-4 grid-cols-1 md:grid-cols-4">
            <Area
              id="shoppingCartLeft"
              className="col-span-1 md:col-span-3"
            />
            <Area
              id="shoppingCartRight"
              className="col-span-1 md:col-span-1"
            />
          </div>
        </div>
        <Area
          id="shoppingCartBottom"
          className="cart-page-bottom"
        />
      </div>
    </div>
  );
}
