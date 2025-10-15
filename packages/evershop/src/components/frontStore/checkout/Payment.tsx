import { useCartState } from '@components/frontStore/cart/CartContext.js';
import {
  useCheckout,
  useCheckoutDispatch
} from '@components/frontStore/checkout/CheckoutContext.js';
import { BillingAddress } from '@components/frontStore/checkout/payment/BillingAddress.js';
import { PaymentMethods } from '@components/frontStore/checkout/payment/PaymentMethods.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React, { useEffect } from 'react';
import { useWatch } from 'react-hook-form';
import { toast } from 'react-toastify';

export function Payment() {
  const {
    data: { billingAddress, availablePaymentMethods },
    loadingStates: { addingBillingAddress }
  } = useCartState();
  const { updateCheckoutData } = useCheckoutDispatch();
  const { form } = useCheckout();
  const paymentMethod = useWatch({
    name: 'paymentMethod',
    control: form.control
  });

  useEffect(() => {
    const updatePaymentMethod = async () => {
      try {
        const paymentMethod = form.getValues('paymentMethod');
        const methodDetails = availablePaymentMethods?.find(
          (method) => method.code === paymentMethod
        );
        if (!methodDetails) {
          throw new Error('Please select a valid payment method');
        }
        updateCheckoutData({ paymentMethod: methodDetails.code });
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : _('Failed to update shipment')
        );
      }
    };
    if (paymentMethod) {
      updatePaymentMethod();
    }
  }, [paymentMethod]);

  return (
    <div className="checkout-shipment">
      <h3>{_('Payment')}</h3>
      <PaymentMethods
        methods={availablePaymentMethods?.map((method) => ({
          ...method
        }))}
        isLoading={addingBillingAddress}
      />
      <BillingAddress billingAddress={billingAddress} />
    </div>
  );
}
