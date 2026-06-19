import Area from '@components/common/Area.js';
import { Button } from '@components/common/ui/Button.js';
import { useCartState } from '@components/frontStore/cart/CartContext.js';
import { useCheckout } from '@components/frontStore/checkout/CheckoutContext.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';
import { useWatch } from 'react-hook-form';

export function CheckoutButton() {
  const {
    data: { noShippingRequired, billingAddress }
  } = useCartState();
  const { form, registeredPaymentComponents } = useCheckout();

  // Watch the selected payment method
  const selectedPaymentMethod = useWatch({
    control: form.control,
    name: 'paymentMethod'
  });

  // Get the payment component for the selected method
  const getPaymentComponent = (methodCode: string) => {
    return registeredPaymentComponents[methodCode] || null;
  };

  // Helper function to render a component safely
  const renderComponent = (
    component: React.ComponentType<any> | undefined,
    props: any
  ) => {
    return component ? React.createElement(component, props) : null;
  };

  // Get the selected payment method component
  const selectedComponent = selectedPaymentMethod
    ? getPaymentComponent(selectedPaymentMethod)
    : null;

  if (noShippingRequired && !billingAddress) {
    return (
      <>
        <Area id="checkoutButtonBefore" />
        <div className="checkout-button-section mt-6">
          <button
            type="button"
            className="w-full bg-muted text-muted-foreground py-3 px-4 rounded-lg font-medium cursor-not-allowed"
            disabled
          >
            {_('Please provide billing address to proceed')}
          </button>
        </div>
        <Area id="checkoutButtonAfter" />
      </>
    );
  }
  return (
    <>
      <Area id="checkoutButtonBefore" />
      <div className="checkout-button-section mt-6">
        {selectedPaymentMethod && selectedComponent?.checkoutButtonRenderer ? (
          // Render the custom checkout button for the selected payment method
          renderComponent(selectedComponent.checkoutButtonRenderer, {
            isSelected: true
          })
        ) : (
          // Default checkout button when no payment method is selected or no custom button
          <Button
            variant={'outline'}
            type="submit"
            size={'xl'}
            className="w-full disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!selectedPaymentMethod}
          >
            {selectedPaymentMethod
              ? _('Complete Order')
              : _('Select a payment method')}
          </Button>
        )}
      </div>
      <Area id="checkoutButtonAfter" />
    </>
  );
}
