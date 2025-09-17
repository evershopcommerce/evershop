import {
  useCheckout,
  useCheckoutDispatch
} from '@components/common/context/checkout.js';
import React, { useEffect } from 'react';
import { toast } from 'react-toastify';
import { _ } from '../../../../../lib/locale/translate/_.js';
import {
  ApiResponse,
  isSuccessResponse
} from '../../../../../types/apiResponse.js';
import { PaypalLogo } from '../../../components/PaypalLogo.js';

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
  const { registerPaymentComponent } = useCheckoutDispatch();

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
        // Wait for 2 seconds and reload the checkout page
        setTimeout(() => {
          window.location.reload();
        }, 2000);
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
                    xmlns="http://www.w3.org/2000/svg"
                    x="0px"
                    y="0px"
                    width="24"
                    height="24"
                    viewBox="0 0 48 48"
                  >
                    <path
                      fill="#1565C0"
                      d="M18.7,13.767l0.005,0.002C18.809,13.326,19.187,13,19.66,13h13.472c0.017,0,0.034-0.007,0.051-0.006C32.896,8.215,28.887,6,25.35,6H11.878c-0.474,0-0.852,0.335-0.955,0.777l-0.005-0.002L5.029,33.813l0.013,0.001c-0.014,0.064-0.039,0.125-0.039,0.194c0,0.553,0.447,0.991,1,0.991h8.071L18.7,13.767z"
                    ></path>
                    <path
                      fill="#039BE5"
                      d="M33.183,12.994c0.053,0.876-0.005,1.829-0.229,2.882c-1.281,5.995-5.912,9.115-11.635,9.115c0,0-3.47,0-4.313,0c-0.521,0-0.767,0.306-0.88,0.54l-1.74,8.049l-0.305,1.429h-0.006l-1.263,5.796l0.013,0.001c-0.014,0.064-0.039,0.125-0.039,0.194c0,0.553,0.447,1,1,1h7.333l0.013-0.01c0.472-0.007,0.847-0.344,0.945-0.788l0.018-0.015l1.812-8.416c0,0,0.126-0.803,0.97-0.803s4.178,0,4.178,0c5.723,0,10.401-3.106,11.683-9.102C42.18,16.106,37.358,13.019,33.183,12.994z"
                    ></path>
                    <path
                      fill="#283593"
                      d="M19.66,13c-0.474,0-0.852,0.326-0.955,0.769L18.7,13.767l-2.575,11.765c0.113-0.234,0.359-0.54,0.88-0.54c0.844,0,4.235,0,4.235,0c5.723,0,10.432-3.12,11.713-9.115c0.225-1.053,0.282-2.006,0.229-2.882C33.166,12.993,33.148,13,33.132,13H19.66z"
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
                    xmlns="http://www.w3.org/2000/svg"
                    x="0px"
                    y="0px"
                    width="24"
                    height="24"
                    viewBox="0 0 48 48"
                  >
                    <path
                      fill="#1565C0"
                      d="M18.7,13.767l0.005,0.002C18.809,13.326,19.187,13,19.66,13h13.472c0.017,0,0.034-0.007,0.051-0.006C32.896,8.215,28.887,6,25.35,6H11.878c-0.474,0-0.852,0.335-0.955,0.777l-0.005-0.002L5.029,33.813l0.013,0.001c-0.014,0.064-0.039,0.125-0.039,0.194c0,0.553,0.447,0.991,1,0.991h8.071L18.7,13.767z"
                    ></path>
                    <path
                      fill="#039BE5"
                      d="M33.183,12.994c0.053,0.876-0.005,1.829-0.229,2.882c-1.281,5.995-5.912,9.115-11.635,9.115c0,0-3.47,0-4.313,0c-0.521,0-0.767,0.306-0.88,0.54l-1.74,8.049l-0.305,1.429h-0.006l-1.263,5.796l0.013,0.001c-0.014,0.064-0.039,0.125-0.039,0.194c0,0.553,0.447,1,1,1h7.333l0.013-0.01c0.472-0.007,0.847-0.344,0.945-0.788l0.018-0.015l1.812-8.416c0,0,0.126-0.803,0.97-0.803s4.178,0,4.178,0c5.723,0,10.401-3.106,11.683-9.102C42.18,16.106,37.358,13.019,33.183,12.994z"
                    ></path>
                    <path
                      fill="#283593"
                      d="M19.66,13c-0.474,0-0.852,0.326-0.955,0.769L18.7,13.767l-2.575,11.765c0.113-0.234,0.359-0.54,0.88-0.54c0.844,0,4.235,0,4.235,0c5.723,0,10.432-3.12,11.713-9.115c0.225-1.053,0.282-2.006,0.229-2.882C33.166,12.993,33.148,13,33.132,13H19.66z"
                    ></path>
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
