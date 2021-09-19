import React, { useState } from 'react';
import { Form } from '../../../../../lib/components/form/Form'
import { Field } from '../../../../../lib/components/form/Field'
import { useAppDispatch, useAppState } from "../../../../../lib/context/app";
import { useCheckoutSteps, useCheckoutStepsDispatch } from "../../../../../lib/context/checkout";
const { get } = require("../../../../../lib/util/get");
import { Title } from './StepTitle'
import produce from 'immer';
import Button from '../../../../../lib/components/form/Button';

function Completed() {
    const state = useAppState();
    const email = get(state, 'cart.customer_email');

    return <div className="checkout-contact-info self-center">
        <div><span>{email}</span></div>
    </div>
}

function Edit({ loginUrl, setContactUrl }) {
    const appDispatch = useAppDispatch();
    const { completeStep } = useCheckoutStepsDispatch();
    const appContext = useAppState();
    const email = get(appContext, 'cart.customer_email', undefined);

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
        completeStep('contact');
    }

    return <div className="">
        <Form
            id={"checkout-contact-info-form"}
            action={setContactUrl}
            method={"POST"}
            onSuccess={onSuccess}
            submitBtn={true}
            btnText="Continue to shipping"
        >
            <Field
                type='text'
                formId={"checkout-contact-info-form"}
                name={"email"}
                validationRules={['notEmpty', 'email']}
                label={"Email"}
                value={email}
            />
            {/* <div>
                <span>You have an account already?</span> <a href={loginUrl} className='hover:underline'>Login</a>
            </div> */}
        </Form>
    </div >
}

const Content = ({ step, loginUrl, setContactInfoUrl }) => {
    if (step.isCompleted === false || step.isEditing === true)
        return <Edit loginUrl={loginUrl} setContactUrl={setContactInfoUrl} />;
    else
        return null;
}

export default function ContactInformationStep({ loginUrl, setContactInfoUrl }) {
    const steps = useCheckoutSteps();
    const step = steps.find((e) => e.id === "contact") || {};
    const [display, setDisplay] = React.useState(false);
    const { canStepDisplay, editStep } = useCheckoutStepsDispatch();

    React.useEffect(() => {
        setDisplay(canStepDisplay(step, steps));
    });

    return <div className="checkout-contact checkout-step">
        <div className='grid-cols-3 grid gap-1' style={{ gridTemplateColumns: '2fr 2fr 1fr' }}>
            <Title step={step} />
            {(step.isCompleted === true && step.isEditing !== true) && <Completed />}
            {(step.isCompleted === true && step.isEditing !== true) && <a href="#" onClick={(e) => { e.preventDefault(); editStep('contact'); }} className='hover:underline text-interactive self-center'>Edit</a>}
        </div>
        {display && <Content step={step} loginUrl={loginUrl} setContactInfoUrl={setContactInfoUrl} />}
    </div>
}