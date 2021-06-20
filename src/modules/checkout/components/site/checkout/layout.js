import React from 'react';
import { Summary } from "./summary/summary";
import Area from "../../../../../lib/components/area";
import { CheckoutProvider } from '../../../../../lib/context/checkout';
import Steps from './steps';

export default function CheckoutPage() {
    return <CheckoutProvider>
        <Area
            id={"checkoutPage"}
            className="row"
            coreWidgets={[
                {
                    'component': { default: Steps },
                    'props': {},
                    'sortOrder': 10,
                    'id': 'checkoutSteps'
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