import React from 'react';
import ShippingMethods from "./shippingMethods";
import { ShippingAddressBlock } from "./shippingAddress";
import Area from "../../../../../../lib/components/area";
import { Title } from '../stepTitle';
import { useCheckoutService, useCheckoutState } from '../../../../../../lib/context/checkout';
import { get } from '../../../../../../lib/util/get';

const Content = ({ step }) => {
    return <Area
        id={"checkoutShipmentStep"}
        className="checkout-step"
        coreWidgets={[
            {
                'component': { default: ShippingAddressBlock },
                'props': {},
                'sortOrder': 10,
                'id': 'shippingAddress'
            },
            {
                'component': { default: ShippingMethods },
                'props': {},
                'sortOrder': 20,
                'id': 'shipmentMethods'
            }
        ]}
    />
}

export default function ShipmentStep() {
    const { steps } = useCheckoutState();
    const step = steps.find((e) => e.id === "shipment");
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