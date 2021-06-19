import React from 'react';
import { Shipment } from "./shipment/shipment";
import { Payment } from "./payment/payment";
import { Summary } from "./summary/summary";
import Area from "../../../../../lib/components/area";
import { CheckoutProvider } from '../../../../../lib/context/checkout';

export default function CheckoutPage() {
    return <CheckoutProvider>
        <Area
            id={"checkoutPage"}
            className="row"
            coreWidgets={[
                {
                    'component': { default: Shipment },
                    'props': {},
                    'sortOrder': 10,
                    'id': 'shipmentBlock'
                },
                {
                    'component': { default: Payment },
                    'props': {},
                    'sortOrder': 20,
                    'id': 'paymentBlock'
                },
                {
                    'component': { default: Summary },
                    'props': {},
                    'sortOrder': 30,
                    'id': 'summaryBlock'
                }
            ]}
        />
    </CheckoutProvider>
}