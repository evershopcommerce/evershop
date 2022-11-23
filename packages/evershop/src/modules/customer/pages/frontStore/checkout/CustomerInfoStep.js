import PropTypes from 'prop-types';
import React from 'react';
import { Form } from '../../../../../lib/components/form/Form';
import { Field } from '../../../../../lib/components/form/Field';
import { useCheckoutSteps, useCheckoutStepsDispatch } from '../../../../../lib/context/checkoutSteps';
import { useCheckout } from '../../../../../lib/context/checkout';

function Edit({ user, setContactInfoUrl, email, setEmail, cartId, loginUrl }) {
  const { completeStep } = useCheckoutStepsDispatch();

  const onSuccess = (response) => {
    setEmail(response.data.email);
    completeStep('contact', response.data.email);
  };

  React.useEffect(() => {
    async function setContactIfLoggedIn() {
      if (!user) {
        return;
      }
      // Post fetch to set contact info
      const response = await fetch(setContactUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: user.email,
          cartId
        })
      });
      const data = await response.json();
      if (data.success === true) {
        setEmail(data.data.email);
        completeStep('contact', data.data.email);
      }
    }
    setContactIfLoggedIn()
  }, []);

  return (
    <div className="">
      <h4 className="mb-1 mt-1">{'Contact information'}</h4>
      {!user && <div className='mb-1'>
        <span>Already have an account?</span> <a className='text-interactive hover:underline' href={loginUrl}>Login</a>
      </div>}
      <Form
        id="checkout-contact-info-form"
        action={setContactInfoUrl}
        method="POST"
        isJSON={true}
        onSuccess={onSuccess}
        submitBtn
        btnText="Continue to shipping"
      >
        <Field
          type="text"
          formId="checkout-contact-info-form"
          name="email"
          validationRules={['notEmpty', 'email']}
          placeholder="Email"
          value={email}
        />
        <Field
          type="hidden"
          formId="checkout-contact-info-form"
          name="cartId"
          value={cartId}
        />
      </Form>
    </div>
  );
}

Edit.propTypes = {
  setContactUrl: PropTypes.string.isRequired
};

export default function ContactInformationStep({ setContactInfoUrl, cart: { customerEmail }, user, loginUrl }) {
  const steps = useCheckoutSteps();
  const { cartId } = useCheckout();
  const [email, setEmail] = React.useState(customerEmail);
  const [display, setDisplay] = React.useState(false);
  const { canStepDisplay, addStep } = useCheckoutStepsDispatch();
  const step = steps.find((e) => e.id === 'contact') || {};

  React.useEffect(() => {
    addStep({
      id: 'contact',
      title: 'Contact information',
      previewTitle: 'Contact',
      isCompleted: customerEmail ? true : false,
      preview: customerEmail ? customerEmail : '',
      sortOrder: 5,
      editable: user ? false : true
    });
  }, []);

  React.useEffect(() => {
    setDisplay(canStepDisplay(step, steps));
  });

  if (step.isCompleted)
    return null;

  return (
    <div className="checkout-contact checkout-step">
      {display && <Edit
        user={user}
        step={step}
        cartId={cartId}
        email={email}
        setContactInfoUrl={setContactInfoUrl}
        setEmail={setEmail}
        loginUrl={loginUrl}
      />}
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
    user: customer(id: getContextValue("customerId", null)) {
      email
    }
    loginUrl: url(routeId: "login")
  }
`