import { Button } from '@components/common/ui/Button.js';
import { toast } from '@components/common/ui/Sonner.js';
import { useCartState } from '@components/frontStore/cart/CartContext.js';
import {
  useCheckout,
  useCheckoutDispatch
} from '@components/frontStore/checkout/CheckoutContext.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React, { useEffect } from 'react';

// Keep in sync with ZERO_CHECKOUT_CODE in
// modules/checkout/services/getAvailablePaymentMethods.ts — client components
// must not import server services.
const ZERO_CHECKOUT_CODE = 'zero_checkout';

export default function ZeroCheckout() {
  const { checkoutSuccessUrl, orderPlaced, orderId, checkoutData, form } =
    useCheckout();
  const { registerPaymentComponent } = useCheckoutDispatch();
  const {
    data: { availablePaymentMethods }
  } = useCartState();

  // The server returns exactly [zero_checkout] for a zero-total cart, so the
  // refreshed availability list — re-synced by CartContext after every cart
  // mutation — is the selection signal. Keying on the list (not the total)
  // avoids racing the re-sync: Payment.tsx toasts an error when the selected
  // code is missing from availablePaymentMethods.
  const methods = availablePaymentMethods || [];
  const zeroOnly =
    methods.length === 1 && methods[0].code === ZERO_CHECKOUT_CODE;

  useEffect(() => {
    if (orderPlaced && checkoutData.paymentMethod === ZERO_CHECKOUT_CODE) {
      // Redirect to the checkout success page
      window.location.href = `${checkoutSuccessUrl}/${orderId}`;
    }
  }, [orderPlaced, checkoutSuccessUrl, orderId]);

  useEffect(() => {
    const current = form.getValues('paymentMethod');
    if (zeroOnly && current !== ZERO_CHECKOUT_CODE) {
      form.setValue('paymentMethod', ZERO_CHECKOUT_CODE);
    } else if (!zeroOnly && current === ZERO_CHECKOUT_CODE) {
      // The total rose above 0 — clear the stale selection so the customer
      // picks a real payment method.
      form.setValue('paymentMethod', '');
    }
  }, [zeroOnly]);

  useEffect(() => {
    registerPaymentComponent(ZERO_CHECKOUT_CODE, {
      nameRenderer: () => (
        <div className="flex items-center justify-between w-full">
          <span>{_('No payment required')}</span>
        </div>
      ),
      formRenderer: () => (
        <div className="flex justify-center text-muted-foreground">
          <div className="w-2/3 text-center py-3">
            {_(
              'Your order total is 0 — no payment is needed to place this order.'
            )}
          </div>
        </div>
      ),
      checkoutButtonRenderer: () => {
        const { checkout } = useCheckoutDispatch();
        const { loadingStates, orderPlaced } = useCheckout();
        const handleClick = async (e: React.MouseEvent) => {
          e.preventDefault();
          try {
            await checkout();
          } catch (error) {
            toast.error(
              error.message || _('Failed to place order. Please try again.')
            );
          }
        };

        const isDisabled = loadingStates.placingOrder || orderPlaced;

        return (
          <Button
            variant={'default'}
            size={'xl'}
            type="button"
            onClick={handleClick}
            disabled={isDisabled}
            className="w-full transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-primary"
          >
            <span className="flex items-center justify-center space-x-2">
              {loadingStates.placingOrder ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  <span>{_('Placing Order...')}</span>
                </>
              ) : orderPlaced ? (
                <>
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                  </svg>
                  <span>{_('Order Placed')}</span>
                </>
              ) : (
                <>
                  <span>{_('Place Order')}</span>
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                  </svg>
                </>
              )}
            </span>
          </Button>
        );
      }
    });
  }, [registerPaymentComponent]);

  return null;
}

export const layout = {
  areaId: 'checkoutFormAfter',
  sortOrder: 15
};
