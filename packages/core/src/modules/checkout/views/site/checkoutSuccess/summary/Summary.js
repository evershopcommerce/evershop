import React from 'react';
import { Items } from './items/Items';
import Area from '../../../../../../lib/components/Area';
import { OrderSummary } from './order/OrderSummary';

function Summary() {
  return (
    <Area
      id="checkoutSuccessSummary"
      className="checkout-summary hidden md:block"
      coreComponents={[
        {
          component: { default: Items },
          props: {},
          sortOrder: 20,
          id: 'checkoutSuccessOrderSummaryItems'
        },
        {
          component: { default: OrderSummary },
          props: {},
          sortOrder: 30,
          id: 'checkoutSuccessOrderSummary'
        }
      ]}
    />
  );
}

export { Summary };
