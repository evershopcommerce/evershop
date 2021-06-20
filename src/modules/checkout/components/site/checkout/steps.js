import React from 'react';
import { Shipment } from "./shipment/shipment";
import { Payment } from "./payment/payment";
import Area from "../../../../../lib/components/area";

export default function Steps() {
    return <Area
        id={"checkoutSteps"}
        className="col-12 col-md-8 checkout-steps"
        coreWidgets={[
            {
                'component': { default: Shipment },
                'props': {},
                'sortOrder': 10,
                'id': 'checkoutShipmentStep'
            },
            {
                'component': { default: Payment },
                'props': {},
                'sortOrder': 10,
                'id': 'checkoutPaymentStep'
            }
        ]}
    />
}