/* eslint-disable no-param-reassign */
import PropTypes from 'prop-types';
import React from 'react';
import produce from 'immer';
import { useCheckoutStepsDispatch } from '../../../../../../lib/context/checkout';
import { CustomerAddressForm } from '../../../../../customer/views/site/address/AddressForm';
import { Form } from '../../../../../../lib/components/form/Form';

export function StepContent({ step, setShipmentInfoAPI, shipmentInfo, setShipmentInfo }) {
  const { completeStep } = useCheckoutStepsDispatch();

  if (step.isCompleted === true && step.isEditing !== true) {
    return null;
  } else {
    return (
      <div>
        <div className="font-bold mb-1">Shipping Address</div>
        <Form
          method="POST"
          action={setShipmentInfoAPI}
          id="checkoutShippingAddressForm"
          btnText="Continue to payment"
          onSuccess={(response) => {
            if (response.success === true) {
              setShipmentInfo(produce(shipmentInfo, (draff) => {
                draff.address = response.data.address;
                draff.method.code = response.data.method.code;
                draff.method.name = response.data.method.name;
              }));
            }
            completeStep('shipment');
          }}
        >
          <CustomerAddressForm
            areaId="checkoutShippingAddressForm"
            address={shipmentInfo.address}
            method={shipmentInfo.method}
            countries={['US', 'VN']}
          />
        </Form>
      </div>
    );
  }
}

StepContent.propTypes = {
  step: PropTypes.shape({
    id: PropTypes.string,
    isCompleted: PropTypes.bool,
    isEditing: PropTypes.bool
  }).isRequired
};
