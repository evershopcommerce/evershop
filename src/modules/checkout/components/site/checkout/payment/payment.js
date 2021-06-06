import React from 'react';
import PaymentMethods from "./payment_methods";
import { BillingAddressBlock } from "./billing_address";
import Area from "../../../../../../lib/components/area";

function Title() {
    return <h4 className="mb-4">Payment</h4>
}

function Payment() {
    return <Area
        id={"checkoutPayment"}
        className="col-12 col-md-4"
        coreWidgets={[
            {
                'component': { default: Title },
                'props': {},
                'sortOrder': 0,
                'id': 'paymentBlockTitle'
            },
            {
                'component': { default: PaymentMethods },
                'props': {},
                'sortOrder': 10,
                'id': 'paymentMethods'
            },
            {
                'component': { default: BillingAddressBlock },
                'props': {},
                'sortOrder': 20,
                'id': 'billingAddress'
            }
        ]}
    />
}

export { Payment }