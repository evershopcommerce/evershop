import { useCheckout } from '@components/frontStore/checkout/CheckoutContext.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';
import { useWatch } from 'react-hook-form';

export function CheckoutButton() {
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

  return (
    <div className="checkout-button-section">
      {selectedPaymentMethod && selectedComponent?.checkoutButtonRenderer ? (
        // Render the custom checkout button for the selected payment method
        renderComponent(selectedComponent.checkoutButtonRenderer, {
          isSelected: true
        })
      ) : (
        // Default checkout button when no payment method is selected or no custom button
        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={!selectedPaymentMethod}
        >
          {selectedPaymentMethod
            ? _('Complete Order')
            : _('Select a payment method')}
        </button>
      )}
    </div>
  );
}
