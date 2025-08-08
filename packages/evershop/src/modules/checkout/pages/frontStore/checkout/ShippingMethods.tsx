import { useCheckout } from '@components/common/context/checkout.js';
import { useCheckoutStepsDispatch } from '@components/common/context/checkoutSteps.js';
import { RadioGroupField } from '@components/common/form/RadioGroupField.js';
import axios from 'axios';
import React from 'react';
import { useFormContext } from 'react-hook-form';
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

interface ShippingMethodsProps {
  getMethodsAPI: string;
  cart: {
    addShippingMethodApi: string;
  };
}

export default function ShippingMethods({
  getMethodsAPI,
  cart: { addShippingMethodApi }
}: ShippingMethodsProps) {
  const { watch, formState } = useFormContext();
  const { completeStep } = useCheckoutStepsDispatch();
  const [loading, setLoading] = React.useState(false);
  const [methods, setMethods] = React.useState<
    { code: string; name: string; cost: number }[]
  >([]);
  const { cartId } = useCheckout();
  const client = useClient();
  const country = watch('address.country');
  const province = watch('address.province');
  const method = watch('method');

  React.useEffect(() => {
    if (!country || !province) {
      setMethods([]);
      return;
    }
    axios
      .get(`${getMethodsAPI}?country=${country}&province=${province || ''}`)
      .then((response) => {
        setMethods((previous) => {
          const { methods: shippingMethods } = response.data.data;
          return shippingMethods.map((m) => {
            const find = previous.find((p) => p.code === m.code);
            if (find) {
              return { ...find, ...m };
            } else {
              return { ...m, selected: false };
            }
          });
        });
        setLoading(false);
      });
  }, [country, province]);

  React.useEffect(() => {
    async function saveMethods() {
      // Get the selected method
      const selectedMethod = methods.find((m) => m.code === method);
      try {
        const response = await axios.post(
          addShippingMethodApi,
          {
            method_code: selectedMethod?.code,
            method_name: selectedMethod?.name || ''
          },
          {
            validateStatus: () => true
          }
        );
        if (!response.data.error) {
          const result = await client
            .query(
              QUERY,
              { cartId },
              {
                requestPolicy: 'network-only'
              }
            )
            .toPromise();
          const address = result.data.cart.shippingAddress;
          await completeStep(
            'shipment',
            `${address.address1}, ${address.city}, ${address.country.name}`
          );
        } else {
          toast.error(response.data.error.message);
        }
      } catch (error) {
        toast.error(error.message);
      }
    }
    if (formState.isSubmitSuccessful) {
      saveMethods();
    }
  }, [formState.isSubmitSuccessful]);

  return (
    <div className="shipping-methods">
      {loading === true && (
        <div className="loading">
          <svg
            style={{
              background: 'rgb(255, 255, 255, 0)',
              display: 'block',
              shapeRendering: 'auto'
            }}
            width="2rem"
            height="2rem"
            viewBox="0 0 100 100"
            preserveAspectRatio="xMidYMid"
          >
            <circle
              cx="50"
              cy="50"
              fill="none"
              stroke="#f6f6f6"
              strokeWidth="10"
              r="43"
              strokeDasharray="202.63272615654165 69.54424205218055"
            >
              <animateTransform
                attributeName="transform"
                type="rotate"
                repeatCount="indefinite"
                dur="1s"
                values="0 50 50;360 50 50"
                keyTimes="0;1"
              />
            </circle>
          </svg>
        </div>
      )}
      <h4 className="mt-7 mb-2">{_('Shipping Method')}</h4>
      {country && province && methods.length === 0 && (
        <div className="text-center p-2 border border-divider rounded text-textSubdued">
          {_('Sorry, there is no available method for your address')}
        </div>
      )}
      {(!country || !province) && (
        <div className="text-center p-2 border border-divider rounded text-textSubdued">
          {_('Please select your country and province first')}
        </div>
      )}
      {methods.length > 0 && (
        <div className="divide-y border rounded border-divider p-2 mb-5">
          <RadioGroupField
            name="method"
            required
            validation={{ required: 'Please select a shipping method' }}
            options={methods.map((m) => ({
              value: m.code,
              label: `${m.name} - ${m.cost}`
            }))}
          />
        </div>
      )}
    </div>
  );
}

export const layout = {
  areaId: 'checkoutShippingAddressForm',
  sortOrder: 60
};

export const query = `
  query Query {
    getMethodsAPI: url(routeId: "getShippingMethods", params: [{ key: "cart_id", value: getContextValue('cart_id') }])
    cart {
      addShippingMethodApi
    }
  }
`;
