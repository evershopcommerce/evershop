import React from 'react';
import Area from '../../../../../lib/components/Area';
import { get } from '../../../../../lib/util/get';
import { useAppState } from '../../../../../lib/context/app';
import Empty from './Empty';
import Items from './items/Items';

function Title({ title }) {
  const items = get(useAppState(), 'cart.items', []);
  if (items.length <= 0) return null;

  return (
    <div className="mb-3 text-center shopping-cart-heading">
      <h1 className="shopping-cart-title mb-05">{title}</h1>
      <a href="/" className="underline">Continue shopping</a>
    </div>
  );
}

export default function ShoppingCart({ cart, removeUrl }) {
  const { totalQty = 0, items = [] } = cart || {};
  if (totalQty <= 0) {
    return <Empty />
  } else {
    return (
      <div>
        <div className="cart page-width">
          <Area
            id="shoppingCartTop"
            className="cart-page-top"
            coreComponents={[
              {
                component: { default: Title },
                props: { title: 'Shopping cart' },
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
                coreComponents={[
                  {
                    component: { default: Items },
                    props: { items: items, cartId: cart.uuid, removeUrl },
                    sortOrder: 10,
                    id: 'shoppingCartTitle'
                  }
                ]}
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
}

export const layout = {
  areaId: 'content',
  sortOrder: 1
}

export const query = `
  query Query {
    cart(id: getContextValue('cartId', null)) {
      totalQty
      uuid
      items {
        cartItemId
        thumbnail
        qty
        productName
        productSku
        productUrl
        productPrice {
          value
          text
        }
        finalPrice {
          value
          text
        }
        total {
          value
          text
        }
      }
    }
    removeUrl: url(routeId: "removeCartItem")
  }
`