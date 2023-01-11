import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { useQuery } from 'urql';
import Area from '../../../../../../../lib/components/Area';
import { useCheckoutStepsDispatch } from '../../../../../../../lib/context/checkoutSteps';
import CustomerAddressForm from '../../../../../../customer/components/Address/AddressForm/Index';
import { Form } from '../../../../../../../lib/components/form/Form';
import { BillingAddress } from './BillingAddress';
import { useCheckout } from '../../../../../../../lib/context/checkout';
import { Field } from '../../../../../../../lib/components/form/Field';
import Button from '../../../../../../../lib/components/form/Button';

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
  cart: {
    billingAddress,
    addBillingAddressApi,
    addPaymentMethodApi
  }
}) {
  const { completeStep } = useCheckoutStepsDispatch();
  const [useShippingAddress, setUseShippingAddress] = useState(!billingAddress);
  const { cartId, paymentMethods, getPaymentMethods } = useCheckout();
  const [loading, setLoading] = useState(false);

  const onSuccess = async (response) => {
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
        completeStep('payment');
      }
    } else {
      setLoading(false);
      toast.error(response.message);
    }
  };

  useEffect(() => {
    getPaymentMethods();
  }, []);

  const [result, reexecuteQuery] = useQuery({
    query: QUERY,
    variables: {
      cartId
    }
  });
  const { data, fetching, error } = result;

  if (fetching) return <p>Loading .....</p>;
  if (error) {
    return (
      <p>
        Oh no...
        {error.message}
      </p>
    );
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
        <h4 className="mb-1 mt-3">Billing Address</h4>
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

        <h4 className="mb-1 mt-3">Payment Method</h4>
        {paymentMethods && paymentMethods.length > 0 && (
          <>
            <div className="divide-y border rounded border-divider px-2 mb-2">
              {paymentMethods.map((method) => (
                <div key={method.code} className="border-divider payment-method-list">
                  <div className="py-2">
                    <Area id={`checkoutPaymentMethod${method.code}`} />
                  </div>
                </div>
              ))}
            </div>
            <Field
              type="hidden"
              name="method_code"
              value={paymentMethods.find((e) => e.selected === true)?.code}
              validationRules={[{
                rule: 'notEmpty',
                message: 'Please select a payment method'
              }]}
            />
            <input type="hidden" value={paymentMethods.find((e) => e.selected === true)?.name} name="method_name" />
            <input type="hidden" value="billing" name="type" />
          </>
        )}
        {paymentMethods.length === 0 && (
          <div className="alert alert-warning">
            No payment methods available
          </div>
        )}
        <div className="form-submit-button">
          <Button
            onAction={
              () => {
                setLoading(true);
                document.getElementById('checkoutPaymentForm').dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
              }
            }
            title="Place Order"
            isLoading={loading}
          />
        </div>
      </Form>
    </div>
  );
}
