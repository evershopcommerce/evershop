import React, { useEffect, useState } from 'react';
import Area from '../../../../../../../lib/components/Area';
import { useCheckoutStepsDispatch } from '../../../../../../../lib/context/checkoutSteps';
import { CustomerAddressForm } from '../../../../../../customer/pages/frontStore/address/AddressForm';
import { Form } from '../../../../../../../lib/components/form/Form';
import { BillingAddress } from './BillingAddress';
import { useCheckout } from '../../../../../../../lib/context/checkout';
import { Field } from '../../../../../../../lib/components/form/Field';

export function StepContent({ setBillingAddressAPI, setPaymentInfoAPI, cart: { billingAddress } }) {
  const { completeStep } = useCheckoutStepsDispatch();
  const [useShippingAddress, setUseShippingAddress] = useState(!billingAddress);
  const [billingCompleted, setBillingCompleted] = useState(false);
  const [paymentMethodCompleted, setPaymentMethodCompleted] = useState(false);
  const { cartId } = useCheckout();

  const onSuccess = (response) => {
    if (response.success === true) {
      setBillingCompleted(true);
    } else {
      setBillingCompleted(false);
    }
  };

  // const billing = () => {
  //   if (!billingCompleted) {
  //     document.getElementById('checkout_billing_address_form')
  // .dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
  //   }
  //   if (!paymentMethodCompleted) {
  //     document.getElementById('checkoutPaymentMethods')
  // .dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
  //   }
  // };

  useEffect(() => {
    if (billingCompleted && paymentMethodCompleted) completeStep('payment');
  }, [billingCompleted, paymentMethodCompleted]);

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
        <input type="hidden" value="stripe" name="methodCode" />
        <input type="hidden" value="Stripe" name="methodName" />
      </Form>
      <Area
        id="checkoutPaymentMethods"
        coreComponents={[]}
      />
    </div>
  );
}
