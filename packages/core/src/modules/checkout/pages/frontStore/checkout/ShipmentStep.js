/* eslint-disable no-param-reassign */
import React from 'react';
import { useCheckoutSteps, useCheckoutStepsDispatch } from '../../../../../lib/context/checkoutSteps';
import { StepContent } from '../../../components/frontStore/checkout/shipment/StepContent';

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
  const { canStepDisplay, editStep, addStep } = useCheckoutStepsDispatch();

  React.useEffect(() => {
    addStep({
      id: 'shipment',
      title: 'Shipment',
      previewTitle: 'Ship To',
      isCompleted: shippingAddress && shippingMethod ? true : false,
      preview: shippingAddress ? `${shippingAddress.address1}, ${shippingAddress.city}, ${shippingAddress.country}` : '',
      sortOrder: 10,
      editable: true
    });
  }, []);

  React.useEffect(() => {
    setDisplay(canStepDisplay(step, steps));
  });

  if (display === false) {
    return null;
  }

  return (
    <div className="checkout-payment checkout-step">
      <StepContent
        step={step}
        shipmentInfo={shipmentInfo}
        setShipmentInfo={setShipmentInfo}
        setShipmentInfoAPI={setShipmentInfoAPI}
      />
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