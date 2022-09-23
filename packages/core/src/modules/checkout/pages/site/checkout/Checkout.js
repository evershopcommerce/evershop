import React from 'react';
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

export default function CheckoutPage({ checkout: { steps }, placeOrderAPI }) {
  return (
    <CheckoutSteps value={steps}>
      <CheckoutProvider placeOrderAPI={placeOrderAPI}>
        <div className="page-width grid grid-cols-1 md:grid-cols-2 gap-3">
          <Area
            id="checkoutPageLeft"
            coreComponents={[
              {
                component: { default: Steps },
                sortOrder: 10
              }
            ]}
          />
          <Area
            id="checkoutPageRight"
          />
        </div>
      </CheckoutProvider>
    </CheckoutSteps>
  );
}

export const layout = {
  areaId: 'content',
  sortOrder: 10
}

export const query = `
  query Query {
    checkout {
      steps {
        id
        title
        isCompleted
        sortOrder
      }
    },
    placeOrderAPI: url(routeId: "checkoutPlaceOrder")
  }
`