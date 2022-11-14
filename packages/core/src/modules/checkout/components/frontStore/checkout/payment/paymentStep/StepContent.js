import React, { useEffect, useState } from 'react';
import Area from '../../../../../../../lib/components/Area';
import { useCheckoutStepsDispatch } from '../../../../../../../lib/context/checkoutSteps';
import { CustomerAddressForm } from '../../../../../../customer/pages/frontStore/address/AddressForm';
import { Form } from '../../../../../../../lib/components/form/Form';
import { BillingAddress } from './BillingAddress';

export function StepContent({ setBillingAddressAPI, setPaymentInfoAPI, cart: { billingAddress } }) {
  const { completeStep } = useCheckoutStepsDispatch();
  const [useShippingAddress, setUseShippingAddress] = useState(!billingAddress);
  const [billingCompleted, setBillingCompleted] = useState(false);
  const [paymentMethodCompleted, setPaymentMethodCompleted] = useState(false);

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
        <h5 className="mb-1 mt-1">Billing Address</h5>
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
        <h5 className="mb-1 mt-1">Payment Method</h5>
        <input type="hidden" value="stripe" name="method" />
      </Form>
      <Area
        id="checkoutPaymentMethods"
        coreComponents={[]}
      />
    </div>
  );
}
