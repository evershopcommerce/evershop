/* eslint-disable no-param-reassign */
import React from 'react';
import { Title } from '../../StepTitle';
import { useCheckoutSteps, useCheckoutStepsDispatch } from '../../../../../../../lib/context/checkout';
import { get } from '../../../../../../../lib/util/get';
import { AddressSummary } from '../../../../../../customer/views/site/address/AddressSummary';
import { useAppState } from '../../../../../../../lib/context/app';
import { StepContent } from './StepContent';

export default function Index() {
  const context = useAppState();
  const steps = useCheckoutSteps();
  const step = steps.find((e) => e.id === 'shipment') || {};
  const [display, setDisplay] = React.useState(false);
  const { canStepDisplay, editStep } = useCheckoutStepsDispatch();

  const shippingAddress = get(context, 'cart.shippingAddress', {});
  const method = { code: get(context.cart, 'shipping_method'), name: get(context.cart, 'shipping_method_name') };

  React.useEffect(() => {
    setDisplay(canStepDisplay(step, steps));
  });

  return (
    <div className="checkout-payment checkout-step">
      <div className="grid-cols-3 grid gap-1 items-start" style={{ gridTemplateColumns: '2fr 2fr 1fr' }}>
        <Title step={step} />
        {(step.isCompleted === true && step.isEditing !== true) && (
          <div>
            <div>
              <AddressSummary address={shippingAddress} />
            </div>
            <div>
              {method.name}
            </div>
          </div>
        )}
        {(step.isCompleted === true && step.isEditing !== true) && <div className="text-right self-center"><a href="#" onClick={(e) => { e.preventDefault(); editStep('shipment'); }} className="hover:underline text-interactive">Edit</a></div>}
      </div>
      {display && <StepContent step={step} />}
    </div>
  );
}
