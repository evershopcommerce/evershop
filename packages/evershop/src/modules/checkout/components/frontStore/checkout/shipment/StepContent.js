/* eslint-disable no-param-reassign */
import PropTypes from 'prop-types';
import React from 'react';
import produce from 'immer';
import { toast } from 'react-toastify';
import CustomerAddressForm from '../../../../../customer/components/Address/AddressForm/Index';
import { Form } from '../../../../../../lib/components/form/Form';
import { useClient } from 'urql';
import { useCheckout } from '../../../../../../lib/context/checkout';

const QUERY = `
  query Query($cartId: String) {
    cart(id: $cartId) {
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

export function StepContent({
  addShippingAddressApi,
  shipmentInfo,
  setShipmentInfo
}) {
  const { cartId } = useCheckout();
  const client = useClient();

  return (
    <div>
      <h4 className="mb-1 mt-3">Shipping Address</h4>
      <Form
        method="POST"
        action={addShippingAddressApi}
        id="checkoutShippingAddressForm"
        isJSON={true}
        btnText="Continue to payment"
        onSuccess={(response) => {
          if (!response.error) {
            client.query(QUERY, { cartId })
              .toPromise()
              .then((result) => {
                const address = result.data.cart.shippingAddress;
                setShipmentInfo(produce(shipmentInfo, (draff) => {
                  draff.address = address;
                }));
              })
          } else {
            toast.error(response.error.message)
          }
        }}
      >
        <CustomerAddressForm
          areaId="checkoutShippingAddressForm"
          address={shipmentInfo.address}
          method={shipmentInfo.method}
        />
        <input type={'hidden'} name={'type'} value={'shipping'} />
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
