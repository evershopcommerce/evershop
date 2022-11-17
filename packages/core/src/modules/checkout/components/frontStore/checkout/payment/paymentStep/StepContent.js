import React, { useEffect, useState } from 'react';
import Area from '../../../../../../../lib/components/Area';
import { useCheckoutStepsDispatch } from '../../../../../../../lib/context/checkoutSteps';
import { CustomerAddressForm } from '../../../../../../customer/pages/frontStore/address/AddressForm';
import { Form } from '../../../../../../../lib/components/form/Form';
import { BillingAddress } from './BillingAddress';
import { useCheckout } from '../../../../../../../lib/context/checkout';
import { Field } from '../../../../../../../lib/components/form/Field';
import { Radio } from '../../../../../../../lib/components/form/fields/Radio';

export function StepContent({
  setBillingAddressAPI,
  setPaymentInfoAPI,
  cart: {
    billingAddress
  }
}) {
  const { completeStep } = useCheckoutStepsDispatch();
  const [useShippingAddress, setUseShippingAddress] = useState(!billingAddress);
  const [billingCompleted, setBillingCompleted] = useState(false);
  const [paymentMethodCompleted, setPaymentMethodCompleted] = useState(false);
  const { cartId, paymentMethods, getPaymentMethods, setPaymentMethods } = useCheckout();

  const onSuccess = (response) => {
    if (response.success === true) {
      setBillingCompleted(true);
    } else {
      setBillingCompleted(false);
    }
  };

  useEffect(() => {
    if (billingCompleted && paymentMethodCompleted)
      completeStep('payment');
  }, [billingCompleted, paymentMethodCompleted]);

  useEffect(() => {
    getPaymentMethods();
  }, []);

  return (
    <div>
      <Form
        method="POST"
        action={setBillingAddressAPI}
        onSuccess={onSuccess}
        onError={() => {
          setBillingCompleted(false);
        }}
        id="checkoutBillingAddressForm"
        submitBtn={false}
        isJSON={true}
      >
        <h4 className="mb-1 mt-3">Billing Address</h4>
        <Field
          name={'cartId'}
          type={'hidden'}
          value={cartId}
        />
        <BillingAddress
          useShippingAddress={useShippingAddress}
          setUseShippingAddress={setUseShippingAddress}
        />
        {useShippingAddress === false && (
          <CustomerAddressForm
            areaId="checkoutBillingAddressForm"
            allowCountries={['US', 'FR', 'CN', 'IN']}
          />
        )}
      </Form>

      <Form
        method="POST"
        action={setPaymentInfoAPI}
        id="checkoutPaymentMethods"
        onSuccess={(response) => {
          if (response.success === true) {
            setPaymentMethodCompleted(true);
          } else {
            setPaymentMethodCompleted(false);
          }
        }}
        onError={() => {
          setPaymentMethodCompleted(false);
        }}
        submitBtn={false}
      >
        <h4 className="mb-1 mt-3">Payment Method</h4>
        <Field
          name={'cartId'}
          type={'hidden'}
          value={cartId}
        />
        {paymentMethods && paymentMethods.length > 0 && (
          <div className='divide-y border rounded border-divider p-1 mb-2'>
            {paymentMethods.map((paymentMethod) => (
              <div key={paymentMethod.code} className="border-divider">
                <Radio
                  name="methodCode"
                  options={[{ value: paymentMethod.code, text: paymentMethod.name }]}
                  value={paymentMethods.find((e) => e.selected === true)?.code}
                  onChange={(value) => {
                    if (value === paymentMethod.code) {
                      setPaymentMethods(previous => previous.map((e) => {
                        if (e.code === value) {
                          e.selected = true;
                        } else {
                          e.selected = false;
                        }
                        return e;
                      }));
                    }
                  }}
                />
                <input type="hidden" value={paymentMethods.find((e) => e.selected === true)?.name} name="methodName" />
              </div>
            ))}
          </div>
        )}
        {paymentMethods.length === 0 && (
          <div className="alert alert-warning">
            No payment methods available
          </div>
        )}
      </Form>
      <Area
        id="checkoutPaymentMethods"
        coreComponents={[]}
      />
    </div>
  );
}
