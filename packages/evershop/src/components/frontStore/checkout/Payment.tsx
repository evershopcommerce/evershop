import Area from '@components/common/Area.js';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '@components/common/ui/Card.js';
import { toast } from '@components/common/ui/Sonner.js';
import {
  useCartDispatch,
  useCartState
} from '@components/frontStore/cart/CartContext.js';
import {
  useCheckout,
  useCheckoutDispatch
} from '@components/frontStore/checkout/CheckoutContext.js';
import { BillingAddress } from '@components/frontStore/checkout/payment/BillingAddress.js';
import { PaymentMethods } from '@components/frontStore/checkout/payment/PaymentMethods.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React, { useEffect } from 'react';
import { useWatch } from 'react-hook-form';

export function Payment() {
  const {
    data: {
      noShippingRequired,
      billingAddress,
      availablePaymentMethods,
      grandTotal,
      totalQty
    },
    loadingStates: { addingBillingAddress }
  } = useCartState();
  // Zero-total orders don't collect a billing address. The totalQty guard
  // matters: the pre-sync default cart state has grandTotal 0, and hiding
  // billing for a still-loading cart would flicker the wrong way.
  const zeroTotal = totalQty > 0 && grandTotal.value <= 0;
  const { addBillingAddress } = useCartDispatch();
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
          throw new Error(_('Please select a valid payment method'));
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
    <>
      <Area id="checkoutPaymentBefore" />
      <div className="checkout__payment space-y-6 mt-6">
        <Card className="rounded-lg border border-border shadow-none ring-0">
          <CardHeader>
            <CardTitle>
              <div className="flex items-center gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                  3
                </span>
                <span className="text-base font-semibold">
                  {_('Payment Information')}
                </span>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!zeroTotal && (
              <BillingAddress
                billingAddress={billingAddress}
                addBillingAddress={addBillingAddress}
                addingBillingAddress={addingBillingAddress}
                noShippingRequired={noShippingRequired}
              />
            )}
            {(billingAddress || noShippingRequired === false || zeroTotal) && (
              <>
                <Area id="checkoutPaymentMethodsBefore" />
                <PaymentMethods
                  methods={availablePaymentMethods?.map((method) => ({
                    ...method
                  }))}
                  isLoading={addingBillingAddress}
                />
                <Area id="checkoutPaymentMethodsAfter" />
              </>
            )}
          </CardContent>
        </Card>
      </div>
      <Area id="checkoutPaymentAfter" />
    </>
  );
}
