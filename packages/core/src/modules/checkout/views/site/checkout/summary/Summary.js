import React from 'react';
import { Items } from './Items';
import { CartSummary } from './Cart';
import Area from '../../../../../../lib/components/Area';

function Summary() {
  return (
    <Area
      id="checkoutSummary"
      className="checkout-summary hidden md:block"
      coreComponents={[
        {
          component: { default: Items },
          props: {},
          sortOrder: 20,
          id: 'checkoutOrderSummaryItems'
        },
        {
          component: { default: CartSummary },
          props: {},
          sortOrder: 30,
          id: 'checkoutOrderSummaryCart'
        }
      ]}
    />
  );
}

export { Summary };
