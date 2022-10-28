import PropTypes from 'prop-types';
import React from 'react';
import { Form } from '../../../../../lib/components/form/Form';
import { Field } from '../../../../../lib/components/form/Field';
import { useCheckoutSteps, useCheckoutStepsDispatch } from '../../../../../lib/context/checkout';
import { Title } from '../../../components/frontStore/checkout/StepTitle';


function Completed({ customerEmail }) {
  return (
    <div className="checkout-contact-info self-center">
      <div><span>{customerEmail}</span></div>
    </div>
  );
}

function Edit({ setContactUrl, email, setEmail }) {
  const { completeStep } = useCheckoutStepsDispatch();
  const onSuccess = (response) => {
    setEmail(response.data.email);
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

function Content({ step, setContactInfoUrl, email, setEmail }) {
  if (step.isCompleted === false || step.isEditing === true) {
    return <Edit setContactUrl={setContactInfoUrl} email={email} setEmail={setEmail} />;
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

export default function ContactInformationStep({ setContactInfoUrl, cart: { customerEmail } }) {
  const steps = useCheckoutSteps();
  const [email, setEmail] = React.useState(customerEmail);
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
        {(step.isCompleted === true && step.isEditing !== true) && <Completed email={email} />}
        {(step.isCompleted === true && step.isEditing !== true) && <div className="self-center text-right"><a href="#" onClick={(e) => { e.preventDefault(); editStep('contact'); }} className="hover:underline text-interactive">Edit</a></div>}
      </div>
      {display && <Content step={step} email={email} setContactInfoUrl={setContactInfoUrl} setEmail={setEmail} />}
    </div>
  );
}

ContactInformationStep.propTypes = {
  setContactInfoUrl: PropTypes.string.isRequired
};

export const layout = {
  areaId: 'checkoutSteps',
  sortOrder: 10
}

export const query = `
  query Query {
    setContactInfoUrl: url(routeId: "checkoutSetContactInfo"),
    cart {
      customerEmail
    }
  }
`