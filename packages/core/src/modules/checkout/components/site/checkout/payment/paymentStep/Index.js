import React from 'react';
import { Title } from '../../StepTitle';
import { useCheckoutSteps, useCheckoutStepsDispatch } from '../../../../../../../lib/context/checkout';
import { StepContent } from './StepContent';

export default function PaymentStep() {
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
      {display && <StepContent step={step} />}
    </div>
  );
}
