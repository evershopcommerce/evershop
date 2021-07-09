import React from 'react';
import Area from "../../../../../../lib/components/area";
import { Title } from '../stepTitle';
import { useCheckoutService } from '../../../../../../lib/context/checkout';
import { get } from '../../../../../../lib/util/get';
import { AddressSummary } from "../../../../../customer/components/site/address/addressSummary";
import { useAppDispatch, useAppState } from '../../../../../../lib/context/app';
import { CustomerAddressForm } from '../../../../../customer/components/site/address/addressForm';
import produce from 'immer';

const Content = ({ step }) => {
    const context = useAppState();
    const dispatch = useAppDispatch();
    const { shippingAddress } = context.cart;
    const method = { code: get(context.cart, "shipping_method"), name: get(context.cart, "shipping_method_name") };

    if (step.isCompleted === true) {
        return <div>
            <div>
                Ship To: <AddressSummary address={shippingAddress} />
            </div>
            <div>
                Shipping method: {method.name}
            </div>
        </div>
    } else {
        return <Area
            id={"checkoutShipmentStep"}
            className="checkout-step"
            coreWidgets={[
                {
                    'component': { default: CustomerAddressForm },
                    'props': {
                        method: "POST",
                        action: context.checkout.setShipmentInfoAPI,
                        formId: "checkout_shipping_address_form",
                        areaId: "checkoutShippingAddressForm",
                        countries: ["US", "VN"], // TODO: update countries
                        btnText: "Continue to payment",
                        onSuccess: (response) => {
                            console.log(response);
                            if (response.success === true) {
                                dispatch(produce(context, draff => {
                                    draff.cart.shippingAddress = response.data.address;
                                    draff.cart.shipping_method = response.data.method.code;
                                    draff.cart.shipping_method_name = response.data.method.name;
                                    draff.checkout.steps = context.checkout.steps.map(step => {
                                        if (step.id === "shipment") {
                                            return { ...step, isCompleted: true };
                                        } else {
                                            return { ...step };
                                        }
                                    });
                                }))
                            }

                        },
                        'sortOrder': 10,
                        'id': 'shippingAddressForm'
                    }
                }
            ]}
        />
    }
}

export default function ShipmentStep() {
    const steps = get(useAppState(), "checkout.steps", []);
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