import PropTypes from 'prop-types';
import React from 'react';
import { toast } from 'react-toastify';
import { Form } from '../../../../../lib/components/form/Form';
import { Field } from '../../../../../lib/components/form/Field';
import { useCheckoutSteps, useCheckoutStepsDispatch } from '../../../../../lib/context/checkoutSteps';
import { useCheckout } from '../../../../../lib/context/checkout';

function Edit({
  user, addContactInfoApi, email, setEmail, loginUrl
}) {
  const { completeStep } = useCheckoutStepsDispatch();

  const onSuccess = (response) => {
    if (!response.error) {
      setEmail(response.data.email);
      completeStep('contact', response.data.email);
    } else {
      toast.error(response.error.message);
    }
  };

  React.useEffect(() => {
    async function setContactIfLoggedIn() {
      if (!user) {
        return;
      }
      // Post fetch to set contact info
      const response = await fetch(addContactInfoApi, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: user.email
        })
      });
      const data = await response.json();
      if (!data.error) {
        setEmail(data.email);
        completeStep('contact', data.email);
      } else {
        toast.error(data.error.message);
      }
    }
    setContactIfLoggedIn();
  }, []);

  return (
    <div className="">
      <h4 className="mb-1 mt-1">Contact information</h4>
      {!user && (
      <div className="mb-1">
        <span>Already have an account?</span>
        {' '}
        <a className="text-interactive hover:underline" href={loginUrl}>Login</a>
      </div>
      )}
      <Form
        id="checkout-contact-info-form"
        action={addContactInfoApi}
        method="POST"
        isJSON
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
      </Form>
    </div>
  );
}

Edit.propTypes = {
  addContactInfoApi: PropTypes.string.isRequired
};

export default function ContactInformationStep({
  cart: {
    customerEmail,
    addContactInfoApi
  },
  user,
  loginUrl
}) {
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
      isCompleted: !!customerEmail,
      preview: customerEmail || '',
      sortOrder: 5,
      editable: !user
    });
  }, []);

  React.useEffect(() => {
    setDisplay(canStepDisplay(step, steps));
  });

  if (step.isCompleted) return null;

  return (
    <div className="checkout-contact checkout-step">
      {display && (
      <Edit
        user={user}
        step={step}
        cartId={cartId}
        email={email}
        addContactInfoApi={addContactInfoApi}
        setEmail={setEmail}
        loginUrl={loginUrl}
      />
      )}
    </div>
  );
}

ContactInformationStep.propTypes = {
  setContactInfoUrl: PropTypes.string.isRequired
};

export const layout = {
  areaId: 'checkoutSteps',
  sortOrder: 10
};

export const query = `
  query Query {
    cart {
      customerEmail
      addContactInfoApi
    }
    user: customer(id: getContextValue("customerId", null)) {
      email
    }
    loginUrl: url(routeId: "login")
  }
`;
