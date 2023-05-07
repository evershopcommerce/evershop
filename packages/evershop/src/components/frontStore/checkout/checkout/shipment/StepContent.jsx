/* eslint-disable no-param-reassign */
import PropTypes from 'prop-types';
import React from 'react';
import produce from 'immer';
import { toast } from 'react-toastify';
import { useClient } from 'urql';
import CustomerAddressForm from '@components/frontStore/customer/address/addressForm/Index';
import { Form } from '@components/common/form/Form';
import { useCheckout } from '@components/common/context/checkout';
import { _ } from '@evershop/evershop/src/lib/locale/translate';

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
      <h4 className="mb-1 mt-3">{_('Shipping Address')}</h4>
      <Form
        method="POST"
        action={addShippingAddressApi}
        id="checkoutShippingAddressForm"
        isJSON
        btnText={_('Continue to payment')}
        onSuccess={(response) => {
          if (!response.error) {
            client
              .query(QUERY, { cartId })
              .toPromise()
              .then((result) => {
                const address = result.data.cart.shippingAddress;
                setShipmentInfo(
                  produce(shipmentInfo, (draff) => {
                    draff.address = address;
                  })
                );
              });
          } else {
            toast.error(response.error.message);
          }
        }}
      >
        <CustomerAddressForm
          areaId="checkoutShippingAddressForm"
          address={shipmentInfo.address}
        />
        <input type="hidden" name="type" value="shipping" />
      </Form>
    </div>
  );
}

StepContent.propTypes = {
  addShippingAddressApi: PropTypes.string.isRequired,
  setShipmentInfo: PropTypes.func.isRequired,
  shipmentInfo: PropTypes.shape({
    address: PropTypes.shape({
      address1: PropTypes.string,
      address2: PropTypes.string,
      city: PropTypes.string,
      country: PropTypes.shape({
        code: PropTypes.string,
        name: PropTypes.string
      }),
      fullName: PropTypes.string,
      id: PropTypes.string,
      postcode: PropTypes.string,
      province: PropTypes.shape({
        code: PropTypes.string,
        name: PropTypes.string
      }),
      telephone: PropTypes.string
    })
  }),
  step: PropTypes.shape({
    id: PropTypes.string,
    isCompleted: PropTypes.bool,
    isEditing: PropTypes.bool
  }).isRequired
};

StepContent.defaultProps = {
  shipmentInfo: {
    address: {}
  }
};
