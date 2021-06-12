import React from 'react';
const { get } = require('../../../../../../lib/util/get');
import Area from '../../../../../../lib/components/area';
import { useAppState } from '../../../../../../lib/context/app';

function Title() {
    return <div><strong>Shipping methods</strong></div>
}

function NoMethod({ areaProps }) {
    if (areaProps.noMethod === false)
        return null;
    const context = useAppState();
    const shippingAddress = get(context, "cart.shippingAddress");
    if (shippingAddress)
        return <div className="no-shipping-method">
            <span>Sorry. There is no shipping method available.</span>
        </div>;
    else
        return <div className="no-shipping-method">
            <span>Please provide shipping address first.</span>
        </div>;
}

export default function ShippingMethods() {
    const [noMethod, setNoMethod] = React.useState(true);
    return <Area
        id="checkoutShippingMethodBlock"
        className="checkout-shipping-methods"
        noMethod={noMethod}
        setNoMethod={setNoMethod}
        coreWidgets={[
            {
                component: { default: Title },
                props: {},
                sortOrder: 0,
                id: "shippingMethodBlockTitle"
            },
            {
                component: { default: NoMethod },
                props: {},
                sortOrder: 100,
                id: "shippingNoMethod"
            }
        ]}
    />
}