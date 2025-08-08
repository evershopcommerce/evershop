import { useCheckout } from '@components/common/context/checkout.js';
import { AddressSummary } from '@components/common/customer/address/AddressSummary.js';
import { Form } from '@components/common/form/Form.js';
import { InputField } from '@components/common/form/InputField.js';
import CustomerAddressForm, {
  Address
} from '@components/frontStore/customer/address/addressForm/Index.js';
import { produce } from 'immer';
import React from 'react';
import { toast } from 'react-toastify';
import { useClient } from 'urql';
import { _ } from '../../../../../lib/locale/translate/_.js';

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

interface StepContentProps {
  addShippingAddressApi: string;
  shipmentInfo: {
    address: Address;
  };
  setShipmentInfo: (info: any) => void;
  step: {
    id: string;
    isCompleted: boolean;
    isEditing: boolean;
  };
  addresses: (Address & { uuid: string; isDefault: boolean })[];
}
export function StepContent({
  addShippingAddressApi,
  shipmentInfo,
  setShipmentInfo,
  addresses
}: StepContentProps) {
  const { cartId } = useCheckout();
  const client = useClient();

  React.useEffect(() => {
    if (!shipmentInfo?.address?.id && addresses.length) {
      setShipmentInfo(
        produce(shipmentInfo, (draff) => {
          const defaultAddress = addresses.find((e) => e.isDefault);
          if (defaultAddress) {
            draff.address = {
              ...defaultAddress
            };
          }
        })
      );
    }
  }, []);

  return (
    <div>
      <h4 className="mb-2 mt-7">{_('Shipping Address')}</h4>
      <div className="grid grid-cols-2 gap-3 mb-3">
        {addresses.map((address) => (
          <div
            className="border rounded border-gray-300 p-3"
            key={address.uuid}
          >
            <AddressSummary key={address.uuid} address={address} />
            <div className="flex justify-end gap-3">
              <a
                href="#"
                className="text-interactive underline"
                onClick={(e) => {
                  e.preventDefault();
                  setShipmentInfo(
                    produce(shipmentInfo, (draff) => {
                      draff.address = {
                        ...address
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
        submitBtnText={_('Continue to payment')}
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
        <InputField type="hidden" name="type" value="shipping" />
      </Form>
    </div>
  );
}
