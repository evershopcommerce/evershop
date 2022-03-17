import React from 'react';
import Area from '../../../../../lib/components/Area';
import { get } from '../../../../../lib/util/get';
import { useAppState } from '../../../../../lib/context/app';
import { getComponents } from '../../../../../lib/components/getComponents';

function Title() {
  const items = get(useAppState(), 'cart.items', []);
  if (items.length <= 0) return null;

  return (
    <div className="mb-3 text-center shopping-cart-heading">
      <h1 className="shopping-cart-title mb-05">Shopping cart</h1>
      <a href="/" className="underline">Continue shopping</a>
    </div>
  );
}

export default function CartLayout() {
  return (
    <div>
      <div className="cart page-width">
        <Area
          id="shoppingCartTop"
          className="cart-page-top"
          components={getComponents()}
          coreComponents={[
            {
              component: { default: Title },
              props: {},
              sortOrder: 10,
              id: 'shoppingCartTitle'
            }
          ]}
        />
        <div className="cart-page-middle">
          <div className="row">
            <Area
              id="shoppingCartLeft"
              className="col-12 col-md-8"
              components={getComponents()}
            />
            <Area
              id="shoppingCartRight"
              className="col-12 col-md-4"
              components={getComponents()}
            />
          </div>
        </div>
        <Area
          id="shoppingCartBottom"
          className="cart-page-bottom"
          components={getComponents()}
        />
      </div>
    </div>
  );
}
