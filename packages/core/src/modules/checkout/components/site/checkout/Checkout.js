import React from 'react';
import { Summary } from './summary/Summary';
import Area from '../../../../../lib/components/Area';
import { CheckoutSteps } from '../../../../../lib/context/checkout';
import { CheckoutProvider } from '../../../../../lib/context/order';
import './Checkout.scss';

function Steps() {
  return (
    <Area
      id="checkoutSteps"
      className="checkout-steps"
      coreComponents={[
      ]}
    />
  );
}

export default function CheckoutPage() {
  return (
    <CheckoutSteps>
      <CheckoutProvider>
        <Area
          id="checkoutPage"
          className="page-width grid grid-cols-1 md:grid-cols-2 gap-3"
          coreComponents={[
            {
              component: { default: Steps },
              props: {},
              sortOrder: 10,
              id: 'checkoutSteps'
            },
            {
              component: { default: Summary },
              props: {},
              sortOrder: 30,
              id: 'summaryBlock'
            }
          ]}
        />
      </CheckoutProvider>
    </CheckoutSteps>
  );
}
