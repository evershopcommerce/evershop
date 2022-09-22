import React, { useEffect, useState } from 'react';
import Area from '../../../../../../../lib/components/Area';
import { useCheckoutStepsDispatch } from '../../../../../../../lib/context/checkout';
import { useAppState } from '../../../../../../../lib/context/app';
import { CustomerAddressForm } from '../../../../../../customer/views/site/address/AddressForm';
import { Form } from '../../../../../../../lib/components/form/Form';
import { BillingAddress } from './BillingAddress';

export function StepContent() {
  const appContext = useAppState();
  const { cart } = appContext;
  const { checkout: { setPaymentInfoAPI, setBillingAddressAPI } } = appContext;
  const { completeStep } = useCheckoutStepsDispatch();
  const [useShippingAddress, setUseShippingAddress] = useState(!cart.billing_address_id);
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
        id="checkout_billing_address_form"
        submitBtn={false}
      >
        <div className="font-bold mb-1">Billing Address</div>
        <BillingAddress
          useShippingAddress={useShippingAddress}
          setUseShippingAddress={setUseShippingAddress}
        />
        {useShippingAddress === false && (
          <CustomerAddressForm
            areaId="checkoutBillingAddressForm"
            countries={['US', 'VN']}
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
        <div className="font-bold mb-1 mt-1">Payment Method</div>
        <input type="hidden" value="stripe" name="payment_method" />
      </Form>
      <Area
        id="checkoutPaymentMethods"
        coreComponents={[]}
      />
      {/* <div className='mt-2 place-order-button'>
            <Button variant="primary" title="Place Order" onAction={billing} />
        </div> */}
    </div>
  );
}
