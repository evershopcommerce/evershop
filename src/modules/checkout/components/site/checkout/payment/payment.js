import React from 'react';
import PaymentMethods from "./paymentMethods";
import { BillingAddressBlock } from "./billingAddress";
import Area from "../../../../../../lib/components/area";

function Title() {
    return <div className="flex">
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-circle">
            <circle cx="12" cy="12" r="10"></circle>
        </svg>
        <h2 className="mb-4 pl-4">Payment</h2>
    </div>
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