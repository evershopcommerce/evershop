import React, { useEffect, useState } from 'react';
import Area from "../../../../../../lib/components/area";
import { Title } from '../StepTitle';
import { useCheckoutSteps, useCheckoutStepsDispatch } from '../../../../../../lib/context/checkout';
import { get } from '../../../../../../lib/util/get';
import { useAppState } from '../../../../../../lib/context/app';
import { CustomerAddressForm } from '../../../../../customer/components/site/address/AddressForm';
import { Form } from '../../../../../../lib/components/form/Form';
import axios from 'axios';
import produce from 'immer';
import { Field } from '../../../../../../lib/components/form/Field';
import Button from '../../../../../../lib/components/form/Button';

const BillingAddress = ({ useShippingAddress, setUseShippingAddress }) => {
    return <div>
        <Field
            type='checkbox'
            formId={"checkout_billing_address_form"}
            name={"use_shipping_address"}
            onChange={(e) => {
                if (e.target.checked) {
                    setUseShippingAddress(true);
                } else {
                    setUseShippingAddress(false);
                }
            }}
            label="My billing address is same as shipping address"
            isChecked={useShippingAddress === true}
        />
    </div>
}

const Content = ({ step }) => {
    const appContext = useAppState();
    let cart = appContext.cart;
    const { checkout: { setPaymentInfoAPI, setBillingAddressAPI, checkoutSuccessPage } } = appContext;
    const { completeStep } = useCheckoutStepsDispatch();
    const [useShippingAddress, setUseShippingAddress] = useState(!cart.billing_address_id);
    const [billingCompleted, setBillingCompleted] = useState(false);
    const [paymentMethodCompleted, setPaymentMethodCompleted] = useState(false);

    const onSuccess = (response) => {
        if (response.success === true) {
            setBillingCompleted(true);
        } else {
            setBillingCompleted(false);
        }
    }

    const billing = () => {
        if (!billingCompleted) {
            document.getElementById('checkout_billing_address_form').dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))
        }
        if (!paymentMethodCompleted) {
            document.getElementById('checkoutPaymentMethods').dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))
        }
    }

    useEffect(() => {
        if (billingCompleted && paymentMethodCompleted)
            completeStep('payment');
    }, [billingCompleted, paymentMethodCompleted]);

    return <div>
        <Form
            method={"POST"}
            action={setBillingAddressAPI}
            onSuccess={onSuccess}
            onError={() => {
                setBillingCompleted(false);
            }}
            id={"checkout_billing_address_form"}
            submitBtn={false}
        >
            <div className="font-bold mb-1">Billing Address</div>
            <BillingAddress
                useShippingAddress={useShippingAddress}
                setUseShippingAddress={setUseShippingAddress}
            />
            {useShippingAddress === false && <CustomerAddressForm
                areaId={"checkoutBillingAddressForm"}
                countries={["US", "VN"]}// TODO: update countries
            />}
        </Form>

        <Form
            method={"POST"}
            action={setPaymentInfoAPI}
            id={"checkoutPaymentMethods"}
            onSuccess={(response) => {
                if (response.success === true) {
                    setPaymentMethodCompleted(true);
                } else {
                    setPaymentMethodCompleted(false);
                }
            }}
            onError={() => {
                setPaymentMethodCompleted(false);
            }}
            submitBtn={false}
        >
            <div className="font-bold mb-1 mt-1">Payment Method</div>
            <input type="hidden" name="payment_method" value="stripe" />
            <Area
                id="checkoutPaymentMethods"
                coreComponents={[]}
            />
        </Form>
        <div className='mt-2 place-order-button'>
            <Button variant="primary" title="Place Order" onAction={billing} />
        </div>
    </div>
}

export default function PaymentStep({ }) {
    const steps = useCheckoutSteps();
    const step = steps.find((e) => e.id === "payment") || {};
    const [display, setDisplay] = React.useState(false);
    const { canStepDisplay, editStep } = useCheckoutStepsDispatch();

    React.useEffect(() => {
        setDisplay(canStepDisplay(step, steps));
    });

    return <div className="checkout-payment checkout-step">
        <Title step={step} />
        {display && <Content step={step} />}
    </div>
}