import {
  useCheckout,
  useCheckoutDispatch
} from '@components/common/context/checkout';
import RenderIfTrue from '@components/common/RenderIfTrue';
import PaypalLogo from '@components/frontStore/paypal/PaypalLogo';
import PropTypes from 'prop-types';
import React, { useEffect, useState } from 'react';
import { _ } from '../../../../../lib/locale/translate/_.js';

export function Paypal({ createOrderAPI, orderId, orderPlaced }) {
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
      const data = await response.json();
      if (!response.error) {
        const { approveUrl } = data.data;
        // Redirect to PayPal for payment approval
        window.location.href = approveUrl;
      } else {
        setError(response.error.message);
      }
    };

    if (orderPlaced && orderId) {
      // Call the API to create the order
      createOrder();
    }
  }, [orderPlaced, orderId]);

  return (
    <div>
      {error && <div className="text-critical mb-4">{error}</div>}
      <div className="p-8 text-center border rounded mt-4 border-divider">
        {_('You will be redirected to PayPal')}
      </div>
    </div>
  );
}

Paypal.propTypes = {
  createOrderAPI: PropTypes.string.isRequired,
  orderId: PropTypes.string,
  orderPlaced: PropTypes.bool.isRequired
};

Paypal.defaultProps = {
  orderId: undefined
};

export default function PaypalMethod({ createOrderAPI }) {
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
      <div className="flex justify-start items-center gap-4">
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
          <PaypalLogo width={70} />
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

PaypalMethod.propTypes = {
  createOrderAPI: PropTypes.string.isRequired
};

export const layout = {
  areaId: 'checkoutPaymentMethodpaypal',
  sortOrder: 10
};

export const query = `
  query Query {
    createOrderAPI: url(routeId: "paypalCreateOrder")
  }
`;
