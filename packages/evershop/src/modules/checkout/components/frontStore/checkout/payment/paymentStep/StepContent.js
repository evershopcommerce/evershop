import React, { useEffect, useState } from 'react';
import Area from '../../../../../../../lib/components/Area';
import { useCheckoutStepsDispatch } from '../../../../../../../lib/context/checkoutSteps';
import CustomerAddressForm from '../../../../../../customer/components/Address/AddressForm/Index';
import { Form } from '../../../../../../../lib/components/form/Form';
import { BillingAddress } from './BillingAddress';
import { useCheckout } from '../../../../../../../lib/context/checkout';
import { Field } from '../../../../../../../lib/components/form/Field';
import Button from '../../../../../../../lib/components/form/Button';

export function StepContent({
  setPaymentInfoAPI,
  cart: {
    billingAddress
  }
}) {
  const { completeStep } = useCheckoutStepsDispatch();
  const [useShippingAddress, setUseShippingAddress] = useState(!billingAddress);
  const { cartId, paymentMethods, getPaymentMethods, setPaymentMethods } = useCheckout();
  const [loading, setLoading] = useState(false);

  const onSuccess = (response) => {
    if (response.success === true) {
      completeStep('payment');
    }
  };

  useEffect(() => {
    getPaymentMethods();
  }, []);

  return (
    <div>
      <Form
        method="POST"
        action={setPaymentInfoAPI}
        onSuccess={onSuccess}
        onValidationError={() => setLoading(false)}
        id="checkoutPaymentForm"
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
          />
        )}

        <h4 className="mb-1 mt-3">Payment Method</h4>
        <Field
          name={'cartId'}
          type={'hidden'}
          value={cartId}
        />
        {paymentMethods && paymentMethods.length > 0 && (
          <>
            <div className='divide-y border rounded border-divider px-2 mb-2'>
              {paymentMethods.map((method) => (
                <div key={method.code} className="border-divider payment-method-list">
                  <div className='py-2'>
                    <Area id={`checkoutPaymentMethod${method.code}`} />
                  </div>
                </div>
              ))}
            </div>
            <Field
              type='hidden'
              name='methodCode'
              value={paymentMethods.find((e) => e.selected === true)?.name}
              validationRules={[{
                rule: 'notEmpty',
                message: 'Please select a payment method'
              }]}
            />
            <input type="hidden" value={paymentMethods.find((e) => e.selected === true)?.name} name="methodName" />
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
