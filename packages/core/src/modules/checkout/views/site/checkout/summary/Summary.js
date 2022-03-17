import React from 'react';
import { Items } from './Items';
import { CartSummary } from './Cart';
import Area from '../../../../../../lib/components/Area';
import { getComponents } from '../../../../../../lib/components/getComponents';

function Summary() {
  return (
    <Area
      id="checkoutSummary"
      className="checkout-summary hidden md:block"
      components={getComponents()}
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
