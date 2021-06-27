import React from 'react';
import { Form } from '../../../../../lib/components/form/form'
import Password from '../../../../../lib/components/form/fields/password'
import Text from '../../../../../lib/components/form/fields/text'
import { useAppState } from "../../../../../lib/context/app";
import { useCheckoutService, useCheckoutState, useCheckoutStateDispatch } from "../../../../../lib/context/checkout";
import { get } from "../../../../../lib/util/get";
import { Title } from '../../../../checkout/components/site/checkout/stepTitle'

function Completed() {
    const state = useAppState();
    const fullName = get(state, 'cart.customer_full_name');
    const email = get(state, 'cart.customer_email');

    return <div className="checkout-contact-info">
        <div><span>Full name:</span> <span>{fullName}</span></div>
        <div><span>Email:</span> <span>{email}</span></div>
    </div>
}

function Edit({ loginUrl, setContactUrl }) {
    const checkoutDispatch = useCheckoutStateDispatch();
    const checkoutState = useCheckoutState();
    const appContext = useAppState();
    const [wantLogin, setWantLogin] = React.useState(false);
    const [wantEdit, setWantEdit] = React.useState(false);
    const [formAction, setFormAction] = React.useState(setContactUrl);
    const fullName = get(appContext, 'cart.full_name', undefined);
    const email = get(appContext, 'cart.email', undefined);

    const onClickWantLogin = (e) => {
        e.preventDefault();
        setFormAction(wantLogin === true ? setContactUrl : loginUrl);
        setWantLogin(!wantLogin);
        setFormButton('Login');
    };

    const onClickWantEdit = (e) => {
        e.preventDefault();
        setWantEdit(true);
    };

    const onSuccess = () => {
        wantEdit === true ? () => setWantEdit(false) : undefined
        checkoutDispatch({
            ...checkoutState, steps: checkoutState.steps.map(step => {
                if (step.id === "contact") {
                    return { ...step, isCompleted: true };
                } else {
                    return { ...step };
                }
            })
        })
    }

    return <div className="">
        <div>
            <strong>Contact information</strong> <a href="#" onClick={(e) => onClickWantLogin(e)}>Login?</a>
        </div>
        {(email && fullName) && <div>
            <div><span>Full name:</span> <span>{fullName}</span></div>
            <div><span>Email:</span> <span>{email}</span></div>
            <a href="#" onClick={(e) => onClickWantEdit(e)}>Edit</a>
        </div>}
        {(!email || !fullName || wantEdit === true || wantLogin === true) && <div>
            <Form
                id={"checkout-contact-info-form"}
                action={formAction}
                method={"POST"}
                submitText={"Continue"}
                onSuccess={onSuccess}
            >
                {wantLogin !== true && <Text
                    formId={"checkout-contact-info-form"}
                    name={"full_name"}
                    validationRules={['notEmpty']}
                    label={"Full name"}
                    value={fullName}
                />}
                <Text
                    formId={"checkout-contact-info-form"}
                    name={"email"}
                    validationRules={['notEmpty', 'email']}
                    label={"Email"}
                    value={email}
                />
                {wantLogin === true && <Password
                    formId={"checkout-contact-info-form"}
                    name={"password"}
                    validationRules={['notEmpty']}
                    label={"Password"}
                />}
            </Form>
        </div>}
    </div>
}

const Content = ({ step, loginUrl, setContactInfoUrl }) => {
    if (step.isCompleted === false)
        return <Edit loginUrl={loginUrl} setContactUrl={setContactInfoUrl} />;
    else
        return <Completed />;
}

export default function ContactInformationStep({ loginUrl, setContactInfoUrl }) {
    const { steps } = useCheckoutState();
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