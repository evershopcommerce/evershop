import React from 'react';
import Area from "../../../../../../lib/components/area";
import { Title } from '../stepTitle';
import { useCheckoutService } from '../../../../../../lib/context/checkout';
import { get } from '../../../../../../lib/util/get';
import { useAppDispatch, useAppState } from '../../../../../../lib/context/app';
import { CustomerAddressForm } from '../../../../../customer/components/site/address/addressForm';
import { Form } from '../../../../../../lib/components/form/form';
import { Radio } from '../../../../../../lib/components/form/fields/radio';
import axios from 'axios';
import produce from 'immer';

const BillingAddress = ({ useShippingAddress, setUseShippingAddress }) => {
    if (useShippingAddress === true)
        return <div>
            <Radio
                name={"use_shipping_address"}
                handler={(e) => {
                    if (e.target.value === 1) {
                        setUseShippingAddress(true);
                    } else {
                        setUseShippingAddress(false);
                    }
                }}
                options={[
                    { value: 1, text: "Use shipping address" },
                    { value: 0, text: "Use different address" }
                ]}
                value={useShippingAddress}
            />
        </div>
    else
        return (null)
}

const Content = ({ step }) => {
    const appContext = useAppState();
    const dispatch = useAppDispatch();
    const { checkout: { setPaymentInfoAPI, checkoutSuccessPage } } = appContext;
    const [useShippingAddress, setUseShippingAddress] = React.useState(true);

    const onSuccess = (response) => {
        if (response.success === true) {
            // Redirect to order success page
            window.location.href = checkoutSuccessPage;
        } else {
            // TODO: toast the error message
        }
    }

    if (useShippingAddress === true) {
        return <Form
            method={"POST"}
            action={setPaymentInfoAPI}
            onSuccess={onSuccess}
            id={"checkout_billing_address_form"}
            btnText="Place order"
        >
            <Area
                id={"checkoutBillingAddressForm"}
                coreWidgets={[
                    {
                        'component': { default: BillingAddress },
                        'props': {
                            useShippingAddress: useShippingAddress,
                            setUseShippingAddress: setUseShippingAddress
                        }
                    }
                ]}
            />
        </Form>
    } else {
        return <div>
            <CustomerAddressForm
                method={"POST"}
                action={setPaymentInfoAPI}
                formId={"checkout_billing_address_form"}
                areaId={"checkoutBillingAddressForm"}
                countries={["US", "VN"]}// TODO: update countries
                btnText="Place order"
            />
        </div>
    }
}

export default function PaymentStep({ }) {
    const steps = get(useAppState(), "checkout.steps", []);
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