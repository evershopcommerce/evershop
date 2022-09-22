/* eslint-disable no-param-reassign */
import PropTypes from 'prop-types';
import React from 'react';
import produce from 'immer';
import { useCheckoutStepsDispatch } from '../../../../../../../lib/context/checkout';
import { get } from '../../../../../../../lib/util/get';
import { useAppDispatch, useAppState } from '../../../../../../../lib/context/app';
import { CustomerAddressForm } from '../../../../../../customer/views/site/address/AddressForm';
import { Form } from '../../../../../../../lib/components/form/Form';

export function StepContent({ step }) {
  const context = useAppState();
  const dispatch = useAppDispatch();
  const { completeStep } = useCheckoutStepsDispatch();

  if (step.isCompleted === true && step.isEditing !== true) {
    return null;
  } else {
    return (
      <div>
        <div className="font-bold mb-1">Shipping Address</div>
        <Form
          method="POST"
          action={context.checkout.setShipmentInfoAPI}
          id="checkout_shipping_address_form"
          btnText="Continue to payment"
          onSuccess={(response) => {
            if (response.success === true) {
              dispatch(produce(context, (draff) => {
                draff.cart.shippingAddress = response.data.address;
                draff.cart.shipping_method = response.data.method.code;
                draff.cart.shipping_method_name = response.data.method.name;
                draff.checkout.steps = context.checkout.steps.map((s) => {
                  if (s.id === 'shipment') {
                    return { ...s, isCompleted: true };
                  } else {
                    return { ...s };
                  }
                });
              }));
            }
            completeStep('shipment');
          }}
        >
          <CustomerAddressForm
            areaId="checkoutShippingAddressForm"
            address={get(context, 'cart.shippingAddress', {})}
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
