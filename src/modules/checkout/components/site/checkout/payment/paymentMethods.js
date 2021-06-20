import React from 'react';
import Area from "../../../../../../lib/components/area"

function Title() {
    return <div><strong>Payment methods</strong></div>
}

export default function PaymentMethods() {
    return <Area
        id="checkoutPaymentMethodBlock"
        className="checkout-payment-methods"
        coreWidgets={[
            {
                component: { default: Title },
                props: {},
                sortOrder: 0,
                id: "paymentMethodBlockTitle"
            }
        ]}
    />
}