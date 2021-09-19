import React from 'react';
import { Title } from '../StepTitle';
import { useCheckoutSteps, useCheckoutStepsDispatch } from '../../../../../../lib/context/checkout';
import { get } from '../../../../../../lib/util/get';
import { AddressSummary } from "../../../../../customer/components/site/address/AddressSummary";
import { useAppDispatch, useAppState } from '../../../../../../lib/context/app';
import { CustomerAddressForm } from '../../../../../customer/components/site/address/AddressForm';
import produce from 'immer';
import { Form } from '../../../../../../lib/components/form/Form';

const Content = ({ step }) => {
    const context = useAppState();
    const dispatch = useAppDispatch();
    const { completeStep } = useCheckoutStepsDispatch();

    if (step.isCompleted === true && step.isEditing !== true) {
        return null;
    } else {
        return <div>
            <div className='font-bold mb-1'>Shipping Address</div>
            <Form
                method="POST"
                action={context.checkout.setShipmentInfoAPI}
                id="checkout_shipping_address_form"
                btnText="Continue to payment"
                onSuccess={(response) => {
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
                    };
                    completeStep('shipment');
                }
                }
            >
                <CustomerAddressForm
                    areaId="checkoutShippingAddressForm"
                    address={get(context, "cart.shippingAddress", {})}
                    countries={["US", "VN"]} // TODO: update countries
                />
            </Form>
        </div>
    }
}

export default function ShipmentStep() {
    const context = useAppState();
    const steps = useCheckoutSteps();
    const step = steps.find((e) => e.id === "shipment") || {};
    const [display, setDisplay] = React.useState(false);
    const { canStepDisplay, editStep } = useCheckoutStepsDispatch();

    const shippingAddress = get(context, 'cart.shippingAddress', {});
    const method = { code: get(context.cart, "shipping_method"), name: get(context.cart, "shipping_method_name") };

    React.useEffect(() => {
        setDisplay(canStepDisplay(step, steps));
    });

    return <div className="checkout-payment checkout-step">
        <div className='grid-cols-3 grid gap-1' style={{ gridTemplateColumns: '2fr 2fr 1fr' }}>
            <Title step={step} />
            {(step.isCompleted === true && step.isEditing !== true) && <div>
                <div>
                    <AddressSummary address={shippingAddress} />
                </div>
                <div>
                    {method.name}
                </div>
            </div>}
            {(step.isCompleted === true && step.isEditing !== true) && <a href="#" onClick={(e) => { e.preventDefault(); editStep('shipment'); }} className='hover:underline text-interactive self-center'>Edit</a>}
        </div>
        {display && <Content step={step} />}
    </div >
}