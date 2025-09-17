import {
  useCheckout,
  useCheckoutDispatch
} from '@components/common/context/checkout.js';
import React, { useEffect } from 'react';
import { _ } from '../../../../../lib/locale/translate/_.js';
import { CODLogo } from '../../../components/CODLogo.js';

interface CashOnDeliveryMethodProps {
  setting: {
    codDisplayName: string;
  };
}

export default function CashOnDeliveryMethod({
  setting
}: CashOnDeliveryMethodProps) {
  const { checkoutSuccessUrl, orderPlaced, orderId, checkoutData } =
    useCheckout();
  const { registerPaymentComponent } = useCheckoutDispatch();

  useEffect(() => {
    if (orderPlaced && checkoutData.paymentMethod === 'cod') {
      // Redirect to the checkout success page
      window.location.href = `${checkoutSuccessUrl}/${orderId}`;
    }
  }, [orderPlaced, checkoutSuccessUrl, orderId]);

  useEffect(() => {
    registerPaymentComponent('cod', {
      nameRenderer: () => (
        <div className="flex items-center justify-between">
          <span>{setting.codDisplayName}</span>
          <CODLogo />
        </div>
      ),
      formRenderer: () => (
        <div className="flex justify-center text-gray-500">
          <div className="w-2/3 text-center p-5">
            {_(
              'Conveniently pay with cash at your doorstep when your order is delivered.'
            )}
          </div>
        </div>
      ),
      checkoutButtonRenderer: () => {
        const { checkout } = useCheckoutDispatch();
        const { loadingStates, orderPlaced } = useCheckout();
        const handleClick = async (e: React.MouseEvent) => {
          e.preventDefault();
          await checkout();
        };

        const isDisabled = loadingStates.placingOrder || orderPlaced;

        return (
          <button
            type="button"
            onClick={handleClick}
            disabled={isDisabled}
            className="w-full bg-green-600 text-white py-4 px-6 rounded-lg font-semibold text-lg shadow-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-green-600"
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
          </button>
        );
      }
    });
  }, [registerPaymentComponent, setting.codDisplayName]);

  return null;
}

export const layout = {
  areaId: 'checkoutForm',
  sortOrder: 10
};

export const query = `
  query Query {
    setting {
      codDisplayName
    }
  }
`;
