/* eslint-disable no-param-reassign */
import PropTypes from 'prop-types';
import React from 'react';
import {
  useCheckoutSteps,
  useCheckoutStepsDispatch
} from '../../../../../lib/context/checkoutSteps';
import { StepContent } from '../../../components/frontStore/checkout/shipment/StepContent';

export default function ShipmentStep({
  cart: {
    shippingAddress,
    shippingMethod,
    addShippingMethodApi,
    addShippingAddressApi
  }
}) {
  const steps = useCheckoutSteps();
  const [shipmentInfo, setShipmentInfo] = React.useState({
    address: shippingAddress
  });
  const step = steps.find((e) => e.id === 'shipment') || {};
  const [display, setDisplay] = React.useState(false);
  const { canStepDisplay, addStep } = useCheckoutStepsDispatch();

  React.useEffect(() => {
    addStep({
      id: 'shipment',
      title: 'Shipment',
      previewTitle: 'Ship To',
      isCompleted: !!(shippingAddress && shippingMethod),
      preview: shippingAddress
        ? `${shippingAddress.address1}, ${shippingAddress.city}, ${shippingAddress.country.name}`
        : '',
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
        addShippingAddressApi={addShippingAddressApi}
        addShippingMethodApi={addShippingMethodApi}
      />
    </div>
  );
}

ShipmentStep.propTypes = {
  cart: PropTypes.shape({
    shippingAddress: PropTypes.shape({
      address1: PropTypes.string,
      address2: PropTypes.string,
      city: PropTypes.string,
      country: PropTypes.shape({
        name: PropTypes.string
      })
    }),
    shippingMethod: PropTypes.string,
    shippingMethodName: PropTypes.string,
    addShippingMethodApi: PropTypes.string,
    addShippingAddressApi: PropTypes.string
  }).isRequired
};

export const layout = {
  areaId: 'checkoutSteps',
  sortOrder: 15
};

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
      addShippingAddressApi: addAddressApi
      addShippingMethodApi
    }
  }
`;
