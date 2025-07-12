import { useCheckout } from '@components/common/context/checkout';
import {
  useCheckoutSteps,
  useCheckoutStepsDispatch
} from '@components/common/context/checkoutSteps';
import { Edit } from '@components/frontStore/customer/checkout/Edit';
import PropTypes from 'prop-types';
import React from 'react';
import { _ } from '../../../../../lib/locale/translate/_.js';

export default function ContactInformationStep({
  cart: { customerEmail, addContactInfoApi },
  currentCustomer,
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
      title: _('Contact information'),
      previewTitle: _('Contact'),
      isCompleted: !!customerEmail,
      preview: customerEmail || '',
      sortOrder: 5,
      editable: !currentCustomer
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
          customer={currentCustomer}
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
  loginUrl: PropTypes.string.isRequired,
  currentCustomer: PropTypes.shape({
    email: PropTypes.string.isRequired
  }),
  cart: PropTypes.shape({
    customerEmail: PropTypes.string,
    addContactInfoApi: PropTypes.string.isRequired
  }).isRequired
};

ContactInformationStep.defaultProps = {
  currentCustomer: null
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
    currentCustomer {
      email
    }
    loginUrl: url(routeId: "login")
  }
`;
