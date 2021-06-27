import React from 'react';
import PaymentMethods from "./paymentMethods";
import { BillingAddressBlock } from "./billingAddress";
import Area from "../../../../../../lib/components/area";
import { Title } from '../stepTitle';
import { useCheckoutService, useCheckoutState } from '../../../../../../lib/context/checkout';
import { get } from '../../../../../../lib/util/get';

function Content() {
    return <Area
        id={"checkoutPayment"}
        className="col-12 col-md-4"
        coreWidgets={[
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

export default function PaymentStep() {
    const { steps } = useCheckoutState();
    const step = steps.find((e) => e.id === "payment");
    const [display, setDisplay] = React.useState(false);
    const { canStepDisplay } = useCheckoutService();

    React.useEffect(() => {
        setDisplay(canStepDisplay(step, steps));
    });
    return <div className="checkout-payment checkout-step">
        <Title step={step} />
        {display && <Content step={step} />}
    </div>
}