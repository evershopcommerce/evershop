import Area from '@components/common/Area';
import { useCheckout } from '@components/common/context/checkout';
import { useCheckoutStepsDispatch } from '@components/common/context/checkoutSteps';
import Button from '@components/common/form/Button';
import { Field } from '@components/common/form/Field';
import { Form } from '@components/common/form/Form';
import Spinner from '@components/common/Spinner';
import { BillingAddress } from '@components/frontStore/checkout/checkout/payment/paymentStep/BillingAddress';
import CustomerAddressForm from '@components/frontStore/customer/address/addressForm/Index';
import PropTypes from 'prop-types';
import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { useQuery } from 'urql';
import { _ } from '../../../../../../lib/locale/translate/_.js';

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
  cart: { billingAddress, addBillingAddressApi, addPaymentMethodApi }
}) {
  const { completeStep } = useCheckoutStepsDispatch();
  const [useShippingAddress, setUseShippingAddress] = useState(!billingAddress);
  const { cartId, error, paymentMethods, getPaymentMethods } = useCheckout();
  const [loading, setLoading] = useState(false);

  const onSuccess = async (response) => {
    try {
      if (!response.error) {
        const selectedMethd = paymentMethods.find((e) => e.selected === true);
        const result = await fetch(addPaymentMethodApi, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            method_code: selectedMethd.code,
            method_name: selectedMethd.name
          })
        });
        const data = await result.json();
        if (!data.error) {
          await completeStep('payment');
        }
      } else {
        setLoading(false);
        toast.error(response.error.message);
      }
    } catch (e) {
      setLoading(false);
      toast.error(e.message);
    }
  };

  useEffect(() => {
    getPaymentMethods();
  }, []);

  useEffect(() => {
    if (error) {
      setLoading(false);
      toast.error(error);
    }
  }, [error]);

  const [result] = useQuery({
    query: QUERY,
    variables: {
      cartId
    }
  });
  const { data, fetching, error: queryError } = result;

  if (fetching) {
    return (
      <div className="flex justify-center items-center p-3">
        <Spinner width={25} height={25} />
      </div>
    );
  }
  if (queryError) {
    return <div className="p-8 text-critical">{error.message}</div>;
  }
  return (
    <div>
      <Form
        method="POST"
        action={addBillingAddressApi}
        onSuccess={onSuccess}
        onValidationError={() => setLoading(false)}
        id="checkoutPaymentForm"
        submitBtn={false}
        isJSON
      >
        <h4 className="mb-4 mt-12">{_('Billing Address')}</h4>
        <BillingAddress
          useShippingAddress={useShippingAddress}
          setUseShippingAddress={setUseShippingAddress}
        />
        {useShippingAddress === false && (
          <div style={{ display: 'block' }}>
            <CustomerAddressForm
              areaId="checkoutBillingAddressForm"
              address={billingAddress || data.cart.shippingAddress}
            />
          </div>
        )}

        {useShippingAddress === true && (
          <div style={{ display: 'none' }}>
            <CustomerAddressForm
              areaId="checkoutBillingAddressForm"
              address={data.cart.shippingAddress}
            />
          </div>
        )}

        <h4 className="mb-4 mt-12">{_('Payment Method')}</h4>
        {paymentMethods && paymentMethods.length > 0 && (
          <>
            <div className="divide-y border rounded border-divider px-8 mb-8">
              {paymentMethods.map((method) => (
                <div
                  key={method.code}
                  className="border-divider payment-method-list"
                >
                  <div className="py-8">
                    <Area id={`checkoutPaymentMethod${method.code}`} />
                  </div>
                </div>
              ))}
            </div>
            <Field
              type="hidden"
              name="method_code"
              value={
                paymentMethods.find((e) => e.selected === true)?.code || ''
              }
              validationRules={[
                {
                  rule: 'notEmpty',
                  message: _('Please select a payment method')
                }
              ]}
            />
            <input
              type="hidden"
              value={
                paymentMethods.find((e) => e.selected === true)?.name || ''
              }
              name="method_name"
            />
            <input type="hidden" value="billing" name="type" />
          </>
        )}
        {paymentMethods.length === 0 && (
          <div className="alert alert-warning">
            {_('No payment method available')}
          </div>
        )}
        <Area id="beforePlaceOrderButton" noOuter />
        <div className="form-submit-button">
          <Button
            onAction={() => {
              setLoading(true);
              document
                .getElementById('checkoutPaymentForm')
                .dispatchEvent(
                  new Event('submit', { cancelable: true, bubbles: true })
                );
            }}
            title={_('Place Order')}
            isLoading={loading}
          />
        </div>
      </Form>
    </div>
  );
}

StepContent.propTypes = {
  cart: PropTypes.shape({
    billingAddress: PropTypes.shape({
      id: PropTypes.number,
      fullName: PropTypes.string,
      postcode: PropTypes.string,
      telephone: PropTypes.string,
      country: PropTypes.shape({
        code: PropTypes.string,
        name: PropTypes.string
      }),
      province: PropTypes.shape({
        code: PropTypes.string,
        name: PropTypes.string
      }),
      city: PropTypes.string,
      address1: PropTypes.string,
      address2: PropTypes.string
    }),
    addBillingAddressApi: PropTypes.string.isRequired,
    addPaymentMethodApi: PropTypes.string.isRequired
  }).isRequired
};
