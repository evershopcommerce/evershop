import {
  useCheckout,
  useCheckoutDispatch
} from '@components/common/context/checkout.js';
import RenderIfTrue from '@components/common/RenderIfTrue.js';
import React, { useEffect, useState } from 'react';
import { _ } from '../../../../../lib/locale/translate/_.js';
import {
  ApiResponse,
  isSuccessResponse
} from '../../../../../types/apiResponse.js';
import { PaypalLogo } from '../../../components/PaypalLogo.js';

interface PaypalProps {
  createOrderAPI: string;
  orderId?: string;
  orderPlaced: boolean;
}
export function Paypal({ createOrderAPI, orderId, orderPlaced }: PaypalProps) {
  const [error, setError] = useState('');

  React.useEffect(() => {
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
        setError(data.error.message);
      }
    };

    if (orderPlaced && orderId) {
      // Call the API to create the order
      createOrder();
    }
  }, [orderPlaced, orderId]);

  return (
    <div>
      {error && <div className="text-critical mb-2">{error}</div>}
      <div className="p-5 text-center border rounded mt-2 border-divider">
        {_('You will be redirected to PayPal')}
      </div>
    </div>
  );
}

interface PaypalMethodProps {
  createOrderAPI: string;
}

export default function PaypalMethod({ createOrderAPI }: PaypalMethodProps) {
  const checkout = useCheckout();
  const { placeOrder } = useCheckoutDispatch();
  const { steps, paymentMethods, setPaymentMethods, orderPlaced, orderId } =
    checkout;
  // Get the selected payment method
  const selectedPaymentMethod = paymentMethods
    ? paymentMethods.find((paymentMethod) => paymentMethod.selected)
    : undefined;

  useEffect(() => {
    const selectedPaymentMethod = paymentMethods.find(
      (paymentMethod) => paymentMethod.selected
    );
    if (
      steps.every((step) => step.isCompleted) &&
      selectedPaymentMethod.code === 'paypal'
    ) {
      placeOrder();
    }
  }, [steps]);

  return (
    <div>
      <div className="flex justify-start items-center gap-2">
        <RenderIfTrue
          condition={
            !selectedPaymentMethod || selectedPaymentMethod.code !== 'paypal'
          }
        >
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setPaymentMethods((previous) =>
                previous.map((paymentMethod) => {
                  if (paymentMethod.code === 'paypal') {
                    return {
                      ...paymentMethod,
                      selected: true
                    };
                  } else {
                    return {
                      ...paymentMethod,
                      selected: false
                    };
                  }
                })
              );
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
            </svg>
          </a>
        </RenderIfTrue>
        <RenderIfTrue
          condition={
            !!selectedPaymentMethod && selectedPaymentMethod.code === 'paypal'
          }
        >
          <div>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#2c6ecb"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
        </RenderIfTrue>
        <div>
          <PaypalLogo width={70} height={30} />
        </div>
      </div>
      <div>
        <RenderIfTrue
          condition={
            !!selectedPaymentMethod && selectedPaymentMethod.code === 'paypal'
          }
        >
          <div>
            <Paypal
              createOrderAPI={createOrderAPI}
              orderPlaced={orderPlaced}
              orderId={orderId}
            />
          </div>
        </RenderIfTrue>
      </div>
    </div>
  );
}

export const layout = {
  areaId: 'checkoutPaymentMethodpaypal',
  sortOrder: 10
};

export const query = `
  query Query {
    createOrderAPI: url(routeId: "paypalCreateOrder")
  }
`;
