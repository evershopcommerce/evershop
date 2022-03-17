import React from 'react';
import ShipmentStep from './shipment/shipmentStep/Index';
import PaymentStep from './payment/paymentStep/Index';
import Area from '../../../../../lib/components/Area';
import { getComponents } from '../../../../../lib/components/getComponents';

export default function CheckoutSteps() {
  return (
    <Area
      id="checkoutSteps"
      className="checkout-steps"
      components={getComponents()}
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
