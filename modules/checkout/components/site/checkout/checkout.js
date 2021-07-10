import React from 'react';
import { Summary } from "./summary/summary";
import Area from "../../../../../lib/components/area";
import { CheckoutProvider } from '../../../../../lib/context/checkout';

const Steps = () => {
    return <Area
        id={"checkoutSteps"}
        className="col-12 col-md-8 checkout-steps"
        coreComponents={[
        ]}
    />
}

export default function CheckoutPage() {
    return <CheckoutProvider>
        <Area
            id={"checkoutPage"}
            className="row"
            coreComponents={[
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