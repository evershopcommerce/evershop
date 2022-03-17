import PropTypes from 'prop-types';
import React from 'react';
import produce from 'immer';
import { Form } from '../../../../../lib/components/form/Form';
import { Field } from '../../../../../lib/components/form/Field';
import { useAppDispatch, useAppState } from '../../../../../lib/context/app';
import { useCheckoutSteps, useCheckoutStepsDispatch } from '../../../../../lib/context/checkout';
import { Title } from './StepTitle';

const { get } = require('../../../../../lib/util/get');

function Completed() {
  const state = useAppState();
  const email = get(state, 'cart.customer_email');

  return (
    <div className="checkout-contact-info self-center">
      <div><span>{email}</span></div>
    </div>
  );
}

function Edit({ setContactUrl }) {
  const appDispatch = useAppDispatch();
  const { completeStep } = useCheckoutStepsDispatch();
  const appContext = useAppState();
  const email = get(appContext, 'cart.customer_email', undefined);

  const onSuccess = (response) => {
    appDispatch(produce(appContext, (draff) => {
      // eslint-disable-next-line no-param-reassign
      draff.checkout.steps = appContext.checkout.steps.map((step) => {
        if (step.id === 'contact') {
          return { ...step, isCompleted: true };
        } else {
          return { ...step };
        }
      });
      // eslint-disable-next-line no-param-reassign
      draff.cart.customer_email = response.data.email;
    }));
    completeStep('contact');
  };

  return (
    <div className="">
      <Form
        id="checkout-contact-info-form"
        action={setContactUrl}
        method="POST"
        onSuccess={onSuccess}
        submitBtn
        btnText="Continue to shipping"
      >
        <Field
          type="text"
          formId="checkout-contact-info-form"
          name="email"
          validationRules={['notEmpty', 'email']}
          label="Email"
          value={email}
        />
      </Form>
    </div>
  );
}

Edit.propTypes = {
  setContactUrl: PropTypes.string.isRequired
};

function Content({ step, setContactInfoUrl }) {
  if (step.isCompleted === false || step.isEditing === true) {
    return <Edit setContactUrl={setContactInfoUrl} />;
  } else {
    return null;
  }
}

Content.propTypes = {
  setContactInfoUrl: PropTypes.string.isRequired,
  step: PropTypes.shape({
    isCompleted: PropTypes.bool,
    isEditing: PropTypes.bool
  }).isRequired
};

export default function ContactInformationStep({ setContactInfoUrl }) {
  const steps = useCheckoutSteps();
  const step = steps.find((e) => e.id === 'contact') || {};
  const [display, setDisplay] = React.useState(false);
  const { canStepDisplay, editStep } = useCheckoutStepsDispatch();

  React.useEffect(() => {
    setDisplay(canStepDisplay(step, steps));
  });

  return (
    <div className="checkout-contact checkout-step">
      <div className="grid-cols-3 grid gap-1" style={{ gridTemplateColumns: '2fr 2fr 1fr' }}>
        <Title step={step} />
        {(step.isCompleted === true && step.isEditing !== true) && <Completed />}
        {(step.isCompleted === true && step.isEditing !== true) && <div className="self-center text-right"><a href="#" onClick={(e) => { e.preventDefault(); editStep('contact'); }} className="hover:underline text-interactive">Edit</a></div>}
      </div>
      {display && <Content step={step} setContactInfoUrl={setContactInfoUrl} />}
    </div>
  );
}

ContactInformationStep.propTypes = {
  setContactInfoUrl: PropTypes.string.isRequired
};
