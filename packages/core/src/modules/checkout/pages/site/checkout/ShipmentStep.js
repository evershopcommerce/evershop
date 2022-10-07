/* eslint-disable no-param-reassign */
import React from 'react';
import { Title } from '../../../components/site/checkout/StepTitle';
import { useCheckoutSteps, useCheckoutStepsDispatch } from '../../../../../lib/context/checkout';
import { AddressSummary } from '../../../../customer/views/site/address/AddressSummary';
import { StepContent } from '../../../components/site/checkout/shipment/StepContent';

export default function ShipmentStep({ cart: { shippingAddress, shippingMethod, shippingMethodName }, setShipmentInfoAPI }) {
  const steps = useCheckoutSteps();
  const [shipmentInfo, setShipmentInfo] = React.useState({
    address: shippingAddress,
    method: {
      name: shippingMethodName,
      code: shippingMethod
    }
  })
  const step = steps.find((e) => e.id === 'shipment') || {};
  const [display, setDisplay] = React.useState(false);
  const { canStepDisplay, editStep } = useCheckoutStepsDispatch();

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
              <AddressSummary address={shipmentInfo.address} />
            </div>
            <div>
              {shipmentInfo.method.name}
            </div>
          </div>
        )}
        {(step.isCompleted === true && step.isEditing !== true) && <div className="text-right self-center"><a href="#" onClick={(e) => { e.preventDefault(); editStep('shipment'); }} className="hover:underline text-interactive">Edit</a></div>}
      </div>
      {display && <StepContent step={step} shipmentInfo={shipmentInfo} setShipmentInfo={setShipmentInfo} setShipmentInfoAPI={setShipmentInfoAPI} />}
    </div>
  );
}

export const layout = {
  areaId: 'checkoutSteps',
  sortOrder: 15
}

export const query = `
  query Query {
    cart {
      shippingMethod
      shippingMethodName
      shippingAddress {
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
    },
    setShipmentInfoAPI: url(routeId: "checkoutSetShipmentInfo")
  }
`