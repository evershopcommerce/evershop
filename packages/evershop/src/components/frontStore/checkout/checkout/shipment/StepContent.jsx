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
import { AddressSummary } from '@components/common/customer/address/AddressSummary';

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
  setShipmentInfo,
  customerAddressSchema,
  addresses
}) {
  const { cartId } = useCheckout();
  const client = useClient();

  React.useEffect(() => {
    // If shipping address is null, apply the default address if available
    if (!shipmentInfo?.address?.id && addresses.length) {
      setShipmentInfo(
        produce(shipmentInfo, (draff) => {
          const defaultAddress = addresses.find((e) => e.isDefault);
          if (defaultAddress) {
            draff.address = {
              ...defaultAddress,
              country: {
                ...defaultAddress.country
              },
              province: {
                ...defaultAddress.province
              }
            };
          }
        })
      );
    }
  }, []);

  return (
    <div>
      <h4 className="mb-4 mt-12">{_('Shipping Address')}</h4>
      <div className="grid grid-cols-2 gap-5 mb-5">
        {addresses.map((address) => (
          <div className="border rounded border-gray-300 p-5">
            <AddressSummary key={address.uuid} address={address} />
            <div className="flex justify-end gap-5">
              <a
                href="#"
                className="text-interactive underline"
                onClick={(e) => {
                  e.preventDefault();
                  setShipmentInfo(
                    produce(shipmentInfo, (draff) => {
                      draff.address = {
                        ...address,
                        country: {
                          ...address.country
                        },
                        province: {
                          ...address.province
                        }
                      };
                    })
                  );
                }}
              >
                {_('Ship here')}
              </a>
            </div>
          </div>
        ))}
      </div>
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
          customerAddressSchema={customerAddressSchema}
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
      id: PropTypes.number,
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
  }).isRequired,
  // eslint-disable-next-line react/forbid-prop-types
  customerAddressSchema: PropTypes.object.isRequired,
  addresses: PropTypes.arrayOf(
    PropTypes.shape({
      uuid: PropTypes.string.isRequired,
      fullName: PropTypes.string.isRequired,
      address1: PropTypes.string.isRequired,
      city: PropTypes.string.isRequired,
      postcode: PropTypes.string.isRequired,
      country: PropTypes.shape({
        name: PropTypes.string.isRequired,
        code: PropTypes.string.isRequired
      }),
      province: PropTypes.shape({
        name: PropTypes.string,
        code: PropTypes.string
      }),
      telephone: PropTypes.string.isRequired,
      isDefault: PropTypes.bool.isRequired
    })
  ).isRequired
};

StepContent.defaultProps = {
  shipmentInfo: {
    address: {}
  }
};
