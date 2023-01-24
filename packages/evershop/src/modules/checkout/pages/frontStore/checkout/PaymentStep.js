import React from 'react';
import { useCheckoutSteps, useCheckoutStepsDispatch } from '../../../../../lib/context/checkoutSteps';
import { StepContent } from '../../../components/frontStore/checkout/payment/paymentStep/StepContent';

export default function PaymentStep({ cart }) {
  const steps = useCheckoutSteps();
  const step = steps.find((e) => e.id === 'payment') || {};
  const [display, setDisplay] = React.useState(false);
  const { canStepDisplay, addStep } = useCheckoutStepsDispatch();

  React.useEffect(() => {
    addStep({
      id: 'payment',
      title: 'Payment',
      previewTitle: 'Payment',
      isCompleted: false,
      sortOrder: 15,
      editable: true
    });
  }, []);

  React.useEffect(() => {
    setDisplay(canStepDisplay(step, steps));
  });

  return (
    <div className="checkout-payment checkout-step">
      {display && (
      <StepContent
        cart={cart}
        step={step}
      />
      )}
    </div>
  );
}

export const layout = {
  areaId: 'checkoutSteps',
  sortOrder: 20
};

export const query = `
  query Query {
    cart {
      billingAddress {
        id: cartAddressId
        fullName
        postcode
        telephone
        country {
          code
          name
        }
        province {
          code
          name
        }
        city
        address1
        address2
      }
      addBillingAddressApi: addAddressApi
      addPaymentMethodApi
    }
  }
`;
