/* eslint-disable no-param-reassign */
import PropTypes from 'prop-types';
import React from 'react';
import produce from 'immer';
import { toast } from 'react-toastify';
import { useCheckoutStepsDispatch } from '../../../../../../lib/context/checkoutSteps';
import { CustomerAddressForm } from '../../../../../customer/pages/frontStore/address/AddressForm';
import { Form } from '../../../../../../lib/components/form/Form';
import { useClient } from 'urql';
import { useCheckout } from '../../../../../../lib/context/checkout';
import { Field } from '../../../../../../lib/components/form/Field';

const QUERY = `
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
    }
  }
`;

export function StepContent({ step, setShipmentInfoAPI, shipmentInfo, setShipmentInfo }) {
  const { completeStep } = useCheckoutStepsDispatch();
  const { cartId } = useCheckout();
  const client = useClient();

  return (
    <div>
      <div className="font-bold mb-1">Shipping Address</div>
      <Form
        method="POST"
        action={setShipmentInfoAPI}
        id="checkoutShippingAddressForm"
        isJSON={false}
        btnText="Continue to payment"
        onSuccess={(response) => {
          if (response.success === true) {
            client.query(QUERY)
              .toPromise()
              .then((result) => {
                setShipmentInfo(produce(shipmentInfo, (draff) => {
                  draff.address = result.data.cart.shippingAddress;
                  draff.method.code = result.data.cart.shippingMethod;
                  draff.method.name = result.data.cart.shippingMethodName;
                }));
                completeStep('shipment');
              })
          } else {
            toast.error(response.message)
          }
        }}
      >
        <Field
          name="cartId"
          type="hidden"
          value={cartId}
        />
        <CustomerAddressForm
          areaId="checkoutShippingAddressForm"
          address={shipmentInfo.address}
          method={shipmentInfo.method}
          allowCountries={['US', 'FR', 'CN', 'IN']} // TODO: get from config
        />
      </Form>
    </div>
  );
}

StepContent.propTypes = {
  step: PropTypes.shape({
    id: PropTypes.string,
    isCompleted: PropTypes.bool,
    isEditing: PropTypes.bool
  }).isRequired
};
