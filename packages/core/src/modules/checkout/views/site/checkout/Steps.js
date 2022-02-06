import React from 'react';
import { ShipmentStep } from './shipment/ShipmentStep';
import { PaymentStep } from './payment/PaymentStep';
import Area from '../../../../../lib/components/Area';

export default function CheckoutSteps() {
  return (
    <Area
      id="checkoutSteps"
      className="checkout-steps"
      coreComponents={[
        {
          component: { default: ShipmentStep },
          props: {},
          sortOrder: 10,
          id: 'checkoutShipmentStep'
        },
        {
          component: { default: PaymentStep },
          props: {},
          sortOrder: 20,
          id: 'checkoutPaymentStep'
        }
      ]}
    />
  );
}
