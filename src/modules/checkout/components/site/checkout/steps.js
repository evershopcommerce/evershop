import React from 'react';
import { ShipmentStep } from "./shipment/shipmentStep";
import { PaymentStep } from "./payment/paymentStep";
import Area from "../../../../../lib/components/area";

export default function CheckoutSteps() {
    return <Area
        id={"checkoutSteps"}
        className="col-12 col-md-8 checkout-steps"
        coreWidgets={[
            {
                'component': { default: ShipmentStep },
                'props': {},
                'sortOrder': 10,
                'id': 'checkoutShipmentStep'
            },
            {
                'component': { default: PaymentStep },
                'props': {},
                'sortOrder': 10,
                'id': 'checkoutPaymentStep'
            }
        ]}
    />
}