import React from 'react';
import { Form } from '../../../../../lib/components/form/form'
import Text from '../../../../../lib/components/form/fields/text'
import { useAppDispatch, useAppState } from "../../../../../lib/context/app";
import { useCheckoutService } from "../../../../../lib/context/checkout";
const { get } = require("../../../../../lib/util/get");
import { Title } from './stepTitle'
import produce from 'immer';

function Completed() {
    const state = useAppState();
    const email = get(state, 'cart.customer_email');

    return <div className="checkout-contact-info">
        <div><span>{email}</span></div>
    </div>
}

function Edit({ loginUrl, setContactUrl }) {
    const appDispatch = useAppDispatch();
    const appContext = useAppState();
    const email = get(appContext, 'cart.email', undefined);

    const onSuccess = (response) => {
        appDispatch(produce(appContext, draff => {
            draff.checkout.steps = appContext.checkout.steps.map(step => {
                if (step.id === "contact") {
                    return { ...step, isCompleted: true };
                } else {
                    return { ...step };
                }
            });
            draff.cart.customer_email = response.data.email
        }));
    }

    return <div className="">
        <Form
            id={"checkout-contact-info-form"}
            action={setContactUrl}
            method={"POST"}
            submitText={"Continue to shipment"}
            onSuccess={onSuccess}
            btnText="Continue to shipping"
        >
            <Text
                formId={"checkout-contact-info-form"}
                name={"email"}
                validationRules={['notEmpty', 'email']}
                label={"Email"}
                value={email}
            />
            <div>
                <strong>You have an account already?</strong> <a href={loginUrl}>Login</a>
            </div>
        </Form>
    </div>
}

const Content = ({ step, loginUrl, setContactInfoUrl }) => {
    if (step.isCompleted === false)
        return <Edit loginUrl={loginUrl} setContactUrl={setContactInfoUrl} />;
    else
        return <Completed />;
}

export default function ContactInformationStep({ loginUrl, setContactInfoUrl }) {
    const steps = get(useAppState(), "checkout.steps", []);
    const step = steps.find((e) => e.id === "contact");
    const [display, setDisplay] = React.useState(false);
    const { canStepDisplay } = useCheckoutService();

    React.useEffect(() => {
        setDisplay(canStepDisplay(step, steps));
    });

    return <div className="checkout-contact checkout-step">
        <Title step={step} />
        {display && <Content step={step} loginUrl={loginUrl} setContactInfoUrl={setContactInfoUrl} />}
    </div>
}