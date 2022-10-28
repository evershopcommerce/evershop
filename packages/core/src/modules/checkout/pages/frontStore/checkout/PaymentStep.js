import React from 'react';
import { Title } from '../../../components/frontStore/checkout/StepTitle';
import { useCheckoutSteps, useCheckoutStepsDispatch } from '../../../../../lib/context/checkout';
import { StepContent } from '../../../components/frontStore/checkout/payment/paymentStep/StepContent';

export default function PaymentStep({ setBillingAddressAPI, setPaymentInfoAPI, cart }) {
  const steps = useCheckoutSteps();
  const step = steps.find((e) => e.id === 'payment') || {};
  const [display, setDisplay] = React.useState(false);
  const { canStepDisplay } = useCheckoutStepsDispatch();

  React.useEffect(() => {
    setDisplay(canStepDisplay(step, steps));
  });

  return (
    <div className="checkout-payment checkout-step">
      <Title step={step} />
      {display && <StepContent cart={cart} step={step} setPaymentInfoAPI={setPaymentInfoAPI} setBillingAddressAPI={setBillingAddressAPI} />}
    </div>
  );
}

export const layout = {
  areaId: 'checkoutSteps',
  sortOrder: 20
}

export const query = `
  query Query {
    setPaymentInfoAPI: url(routeId: "checkoutSetPaymentInfo")
    setBillingAddressAPI: url(routeId: "checkoutSetBillingAddressInfo")
    cart {
      billingAddress {
        cartAddressId
      }
    }
  }
`