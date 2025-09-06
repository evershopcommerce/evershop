import {
  useCheckout,
  useCheckoutDispatch
} from '@components/common/context/checkout.js';
import React, { useEffect } from 'react';
import { _ } from '../../../../../lib/locale/translate/_.js';
import {
  ApiResponse,
  isSuccessResponse
} from '../../../../../types/apiResponse.js';
import { PaypalLogo } from '../../../components/PaypalLogo.js';
import { toast } from 'react-toastify';

interface PaypalMethodProps {
  createOrderAPI: string;
  setting: {
    paypalDisplayName: string;
  };
}

export default function PaypalMethod({
  createOrderAPI,
  setting: { paypalDisplayName }
}: PaypalMethodProps) {
  const {
    checkoutSuccessUrl,
    orderPlaced,
    orderId,
    checkoutData: { paymentMethod }
  } = useCheckout();
  const { registerPaymentComponent, setError } = useCheckoutDispatch();

  useEffect(() => {
    const createOrder = async () => {
      const response = await fetch(createOrderAPI, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          order_id: orderId
        })
      });
      const data = (await response.json()) as ApiResponse<{
        approveUrl: string;
      }>;
      if (isSuccessResponse(data)) {
        const { approveUrl } = data.data;
        // Redirect to PayPal for payment approval
        window.location.href = approveUrl;
      } else {
        toast.error(data.error.message);
      }
    };

    if (orderPlaced && orderId && paymentMethod === 'paypal') {
      // Call the API to create the order
      createOrder();
    }
  }, [orderPlaced, checkoutSuccessUrl, orderId]);

  useEffect(() => {
    registerPaymentComponent('paypal', {
      nameRenderer: () => (
        <div className="flex items-center justify-between">
          <span>{paypalDisplayName}</span>
          <PaypalLogo />
        </div>
      ),
      formRenderer: () => (
        <div className="flex justify-center text-gray-500">
          <div className="w-2/3 text-center p-5">
            {_('You will be redirected to PayPal for payment processing.')}
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
            className="w-full text-white py-4 px-6 rounded-lg font-semibold text-lg shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: isDisabled ? '#0070ba80' : '#0070ba'
            }}
            onMouseEnter={(e) => {
              if (!isDisabled) {
                e.currentTarget.style.backgroundColor = '#005ea6';
              }
            }}
            onMouseLeave={(e) => {
              if (!isDisabled) {
                e.currentTarget.style.backgroundColor = '#0070ba';
              }
            }}
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
                  <span>{_('Redirecting to PayPal...')}</span>
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
                  <span>{_('Redirecting to PayPal...')}</span>
                </>
              ) : (
                <>
                  <svg
                    className="w-6 h-6 mr-2"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a.58.58 0 0 0-.58-.58H18.32a.58.58 0 0 0-.58.58v.87a.58.58 0 0 0 .58.58h2.322a.58.58 0 0 0 .58-.58v-.87z" />
                  </svg>
                  <span>{_('Pay with PayPal')}</span>
                </>
              )}
            </span>
          </button>
        );
      }
    });
  }, [registerPaymentComponent, paypalDisplayName]);

  return null;
}

export const layout = {
  areaId: 'checkoutForm',
  sortOrder: 10
};

export const query = `
  query Query {
    setting {
      paypalDisplayName
    }
    createOrderAPI: url(routeId: "paypalCreateOrder")
  }
`;
