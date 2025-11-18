import Spinner from '@components/admin/Spinner.js';
import Button from '@components/common/Button.js';
import RenderIfTrue from '@components/common/RenderIfTrue.js';
import { useCartState } from '@components/frontStore/cart/CartContext.js';
import {
  useCheckout,
  useCheckoutDispatch
} from '@components/frontStore/checkout/CheckoutContext.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import { Elements } from '@stripe/react-stripe-js';
import {
  PaymentElement,
  useElements,
  useStripe
} from '@stripe/react-stripe-js';
import { loadStripe, StripeElementsOptions } from '@stripe/stripe-js';
import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import smallUnit from 'zero-decimal-currencies';

const TestCards: React.FC<{
  showTestCard: 'success' | 'failure';
  testSuccess: () => void;
  testFailure: () => void;
}> = ({ showTestCard, testSuccess, testFailure }) => {
  return (
    <div>
      <div
        style={{
          border: '1px solid #dddddd',
          borderRadius: '3px',
          padding: '5px',
          boxSizing: 'border-box',
          marginBottom: '10px'
        }}
      >
        {showTestCard === 'success' && (
          <div>
            <div>
              <b>Test success:</b>
            </div>
            <div className="text-xs text-gray-600">
              Test card number: 4242 4242 4242 4242
            </div>
            <div className="text-xs text-gray-600">Test card expiry: 04/26</div>
            <div className="text-xs text-gray-600">Test card CVC: 242</div>
          </div>
        )}
        {showTestCard === 'failure' && (
          <div>
            <div>
              <b>Test failure:</b>
            </div>
            <div className="text-xs text-gray-600">
              Test card number: 4000 0000 0000 9995
            </div>
            <div className="text-xs text-gray-600">Test card expiry: 04/26</div>
            <div className="text-xs text-gray-600">Test card CVC: 242</div>
          </div>
        )}
      </div>
      <div className="stripe-form-heading flex justify-between">
        <div className="self-center">
          <svg
            id="Layer_1"
            data-name="Layer 1"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 150 34"
          >
            <defs />
            <title>Powered by Stripe</title>
            <path d="M146,0H3.73A3.73,3.73,0,0,0,0,3.73V30.27A3.73,3.73,0,0,0,3.73,34H146a4,4,0,0,0,4-4V4A4,4,0,0,0,146,0Zm3,30a3,3,0,0,1-3,3H3.73A2.74,2.74,0,0,1,1,30.27V3.73A2.74,2.74,0,0,1,3.73,1H146a3,3,0,0,1,3,3Z" />
            <path d="M17.07,11.24h-4.3V22h1.92V17.84h2.38c2.4,0,3.9-1.16,3.9-3.3S19.47,11.24,17.07,11.24Zm-.1,5H14.69v-3.3H17c1.38,0,2.11.59,2.11,1.65S18.35,16.19,17,16.19Z" />
            <path d="M25.1,14a3.77,3.77,0,0,0-3.8,4.09,3.81,3.81,0,1,0,7.59,0A3.76,3.76,0,0,0,25.1,14Zm0,6.67c-1.22,0-2-1-2-2.58s.76-2.58,2-2.58,2,1,2,2.58S26.31,20.66,25.1,20.66Z" />
            <polygon points="36.78 19.35 35.37 14.13 33.89 14.13 32.49 19.35 31.07 14.13 29.22 14.13 31.59 22.01 33.15 22.01 34.59 16.85 36.03 22.01 37.59 22.01 39.96 14.13 38.18 14.13 36.78 19.35" />
            <path d="M44,14a3.83,3.83,0,0,0-3.75,4.09,3.79,3.79,0,0,0,3.83,4.09A3.47,3.47,0,0,0,47.49,20L46,19.38a1.78,1.78,0,0,1-1.83,1.26A2.12,2.12,0,0,1,42,18.47h5.52v-.6C47.54,15.71,46.32,14,44,14Zm-1.93,3.13A1.92,1.92,0,0,1,44,15.5a1.56,1.56,0,0,1,1.69,1.62Z" />
            <path d="M50.69,15.3V14.13h-1.8V22h1.8V17.87a1.89,1.89,0,0,1,2-2,4.68,4.68,0,0,1,.66,0v-1.8c-.14,0-.3,0-.51,0A2.29,2.29,0,0,0,50.69,15.3Z" />
            <path d="M57.48,14a3.83,3.83,0,0,0-3.75,4.09,3.79,3.79,0,0,0,3.83,4.09A3.47,3.47,0,0,0,60.93,20l-1.54-.59a1.78,1.78,0,0,1-1.83,1.26,2.12,2.12,0,0,1-2.1-2.17H61v-.6C61,15.71,59.76,14,57.48,14Zm-1.93,3.13a1.92,1.92,0,0,1,1.92-1.62,1.56,1.56,0,0,1,1.69,1.62Z" />
            <path d="M67.56,15a2.85,2.85,0,0,0-2.26-1c-2.21,0-3.47,1.85-3.47,4.09s1.26,4.09,3.47,4.09a2.82,2.82,0,0,0,2.26-1V22h1.8V11.24h-1.8Zm0,3.35a2,2,0,0,1-2,2.28c-1.31,0-2-1-2-2.52s.7-2.52,2-2.52c1.11,0,2,.81,2,2.29Z" />
            <path d="M79.31,14A2.88,2.88,0,0,0,77,15V11.24h-1.8V22H77v-.83a2.86,2.86,0,0,0,2.27,1c2.2,0,3.46-1.86,3.46-4.09S81.51,14,79.31,14ZM79,20.6a2,2,0,0,1-2-2.28v-.47c0-1.48.84-2.29,2-2.29,1.3,0,2,1,2,2.52S80.25,20.6,79,20.6Z" />
            <path d="M86.93,19.66,85,14.13H83.1L86,21.72l-.3.74a1,1,0,0,1-1.14.79,4.12,4.12,0,0,1-.6,0v1.51a4.62,4.62,0,0,0,.73.05,2.67,2.67,0,0,0,2.78-2l3.24-8.62H88.82Z" />
            <path d="M125,12.43a3,3,0,0,0-2.13.87l-.14-.69h-2.39V25.53l2.72-.59V21.81a3,3,0,0,0,1.93.7c1.94,0,3.72-1.59,3.72-5.11C128.71,14.18,126.91,12.43,125,12.43Zm-.65,7.63a1.61,1.61,0,0,1-1.28-.52l0-4.11a1.64,1.64,0,0,1,1.3-.55c1,0,1.68,1.13,1.68,2.58S125.36,20.06,124.35,20.06Z" />
            <path d="M133.73,12.43c-2.62,0-4.21,2.26-4.21,5.11,0,3.37,1.88,5.08,4.56,5.08a6.12,6.12,0,0,0,3-.73V19.64a5.79,5.79,0,0,1-2.7.62c-1.08,0-2-.39-2.14-1.7h5.38c0-.15,0-.74,0-1C137.71,14.69,136.35,12.43,133.73,12.43Zm-1.47,4.07c0-1.26.77-1.79,1.45-1.79s1.4.53,1.4,1.79Z" />
            <path d="M113,13.36l-.17-.82h-2.32v9.71h2.68V15.67a1.87,1.87,0,0,1,2.05-.58V12.54A1.8,1.8,0,0,0,113,13.36Z" />
            <path d="M99.46,15.46c0-.44.36-.61.93-.61a5.9,5.9,0,0,1,2.7.72V12.94a7,7,0,0,0-2.7-.51c-2.21,0-3.68,1.18-3.68,3.16,0,3.1,4.14,2.6,4.14,3.93,0,.52-.44.69-1,.69a6.78,6.78,0,0,1-3-.9V22a7.38,7.38,0,0,0,3,.64c2.26,0,3.82-1.15,3.82-3.16C103.62,16.12,99.46,16.72,99.46,15.46Z" />
            <path d="M107.28,10.24l-2.65.58v8.93a2.77,2.77,0,0,0,2.82,2.87,4.16,4.16,0,0,0,1.91-.37V20c-.35.15-2.06.66-2.06-1V15h2.06V12.66h-2.06Z" />
            <polygon points="116.25 11.7 118.98 11.13 118.98 8.97 116.25 9.54 116.25 11.7" />
            <rect x="116.25" y="12.61" width="2.73" height="9.64" />
          </svg>
        </div>
        <div className="self-center flex space-x-2 pb-2">
          <Button
            onAction={testSuccess}
            title="Test success"
            outline
            variant="primary"
          />
          <Button
            onAction={testFailure}
            title="Test failure"
            variant="danger"
            outline
          />
        </div>
      </div>
    </div>
  );
};

interface CheckoutFormProps {
  stripePublishableKey: string;
  createPaymentIntentApi: string;
  returnUrl: string;
}

export function CheckoutForm({
  stripePublishableKey,
  createPaymentIntentApi,
  returnUrl
}: CheckoutFormProps) {
  const [clientSecret, setClientSecret] = React.useState('');
  const [showTestCard, setShowTestCard] = useState<'success' | 'failure'>(
    'success'
  );
  const stripe = useStripe();
  const elements = useElements();
  const {
    cartId,
    orderId,
    orderPlaced,
    checkoutData: { paymentMethod }
  } = useCheckout();

  const {
    data: { billingAddress, shippingAddress, customerFullName, customerEmail }
  } = useCartState();

  useEffect(() => {
    const validateStripe = async () => {
      if (!stripe || !elements) {
        toast.error(_('Stripe is not loaded. Please try again.'));
        return false;
      }

      const submit = await elements.submit();
      if (submit?.error) {
        toast.error(
          submit.error.message ||
            _('Can not process payment. Please try again later.')
        );
        return false;
      }

      return true;
    };

    // Make validation function available globally
    if (typeof window !== 'undefined') {
      (window as any).validateStripePayment = validateStripe;
    }

    return () => {
      if (typeof window !== 'undefined') {
        delete (window as any).validateStripePayment;
      }
    };
  }, [stripe, elements]);

  useEffect(() => {
    if (orderId && orderPlaced && paymentMethod === 'stripe') {
      window
        .fetch(createPaymentIntentApi, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ cart_id: cartId, order_id: orderId })
        })
        .then((res) => res.json())
        .then((data) => {
          if (data.error) {
            toast.error(_('Some error occurred. Please try again later.'));
          } else {
            setClientSecret(data.data.clientSecret);
          }
        });
    }
  }, [orderId, orderPlaced]);

  useEffect(() => {
    const confirmPayment = async () => {
      const payload = await stripe?.confirmPayment({
        clientSecret: clientSecret as string,
        elements: elements as any,
        confirmParams: {
          payment_method_data: {
            billing_details: {
              name:
                billingAddress?.fullName ||
                shippingAddress?.fullName ||
                customerFullName ||
                '',
              email: customerEmail,
              phone:
                billingAddress?.telephone || shippingAddress?.telephone || '',
              address: {
                line1:
                  billingAddress?.address1 || shippingAddress?.address1 || '',
                country:
                  billingAddress?.country?.code ||
                  shippingAddress?.country?.code ||
                  '',
                state:
                  billingAddress?.province?.code ||
                  shippingAddress?.province?.code ||
                  '',
                postal_code:
                  billingAddress?.postcode || shippingAddress?.postcode || '',
                city: billingAddress?.city || shippingAddress?.city || ''
              }
            }
          },
          return_url: `${returnUrl}?order_id=${orderId}`
        }
      });
      if (payload?.error) {
        // Get the payment intent ID
        const paymentIntent = payload.error.payment_intent;
        // Redirect to the return URL with the payment intent ID
        window.location.href = `${returnUrl}?order_id=${orderId}&payment_intent=${paymentIntent?.id}`;
      }
    };
    if (orderPlaced && clientSecret) {
      confirmPayment();
    }
  }, [orderPlaced, clientSecret]);

  const testSuccess = () => {
    setShowTestCard('success');
  };

  const testFailure = () => {
    setShowTestCard('failure');
  };

  return (
    <>
      <RenderIfTrue condition={!!(stripe && elements)}>
        <div>
          <div className="stripe-form">
            {stripePublishableKey &&
              stripePublishableKey.startsWith('pk_test') && (
                <TestCards
                  showTestCard={showTestCard}
                  testSuccess={testSuccess}
                  testFailure={testFailure}
                />
              )}
            <PaymentElement id="payment-element" />
          </div>
        </div>
      </RenderIfTrue>
      <RenderIfTrue condition={!!(!stripe || !elements)}>
        <div className="flex justify-center p-3">
          <Spinner width={20} height={20} />
        </div>
      </RenderIfTrue>
    </>
  );
}

// Make sure to call loadStripe outside of a component’s render to avoid
// recreating the Stripe object on every render.
// loadStripe is initialized with your real test publishable API key.
let stripe;
const stripeLoader = (publishKey) => {
  if (!stripe) {
    stripe = loadStripe(publishKey);
  }
  return stripe;
};

interface StripeAppProps {
  total: number;
  currency: string;
  stripePublishableKey: string;
  returnUrl: string;
  createPaymentIntentApi: string;
  stripePaymentMode: string;
}

interface CardsProps {
  width?: number;
  height?: number;
}

function Cards({ width = 24, height = 24 }: CardsProps) {
  return (
    <img
      width={width}
      height={height}
      src="data:image/png;base64,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"
      alt="Stripe"
      role="presentation"
    />
  );
}

const StripeApp: React.FC<StripeAppProps> = React.memo(
  ({
    total,
    currency,
    stripePublishableKey,
    returnUrl,
    createPaymentIntentApi,
    stripePaymentMode
  }: StripeAppProps) => {
    const options = React.useMemo(
      () =>
        ({
          mode: 'payment',
          currency: currency.toLowerCase(),
          amount: Number(smallUnit(total, currency)),
          capture_method:
            stripePaymentMode === 'capture' ? 'automatic_async' : 'manual'
        } as StripeElementsOptions),
      [total, currency, stripePaymentMode]
    );

    return (
      <div className="stripe__app">
        <Elements stripe={stripeLoader(stripePublishableKey)} options={options}>
          <CheckoutForm
            stripePublishableKey={stripePublishableKey}
            returnUrl={returnUrl}
            createPaymentIntentApi={createPaymentIntentApi}
          />
        </Elements>
      </div>
    );
  }
);

interface StripeMethodProps {
  setting: {
    stripeDisplayName: string;
    stripePublishableKey: string;
    stripePaymentMode: string;
  };
  cart: {
    grandTotal: {
      value: number;
    };
    currency: string;
  };
  returnUrl: string;
  createPaymentIntentApi: string;
}

export default function StripeMethod({
  setting,
  cart: { grandTotal, currency },
  returnUrl,
  createPaymentIntentApi
}: StripeMethodProps) {
  const { registerPaymentComponent } = useCheckoutDispatch();
  useEffect(() => {
    registerPaymentComponent('stripe', {
      nameRenderer: () => (
        <div className="flex items-center justify-between">
          <span>{setting.stripeDisplayName}</span>
          <Cards width={100} />
        </div>
      ),
      formRenderer: () => (
        <StripeApp
          total={grandTotal.value}
          currency={currency}
          stripePublishableKey={setting.stripePublishableKey}
          returnUrl={returnUrl}
          createPaymentIntentApi={createPaymentIntentApi}
          stripePaymentMode={setting.stripePaymentMode}
        />
      ),
      checkoutButtonRenderer: () => {
        const { checkout } = useCheckoutDispatch();
        const { loadingStates, orderPlaced } = useCheckout();
        const handleClick = async (e: React.MouseEvent) => {
          e.preventDefault();
          const validateStripe = (window as any)?.validateStripePayment;
          if (validateStripe) {
            await validateStripe();
          }
          // If validation passed, proceed with order placement
          await checkout();
        };

        const isDisabled = loadingStates.placingOrder || orderPlaced;

        return (
          <button
            type="button"
            onClick={handleClick}
            disabled={isDisabled}
            className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white py-4 px-6 rounded-lg font-semibold text-lg shadow-lg hover:from-indigo-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:from-indigo-500 disabled:to-purple-600"
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
                  <span>{_('Processing Payment...')}</span>
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
                  <span>{_('Pay with Stripe')}</span>
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.594-7.305h.003z" />
                  </svg>
                </>
              )}
            </span>
          </button>
        );
      }
    });
  }, [registerPaymentComponent, setting.stripeDisplayName]);

  return null;
}

export const layout = {
  areaId: 'checkoutForm',
  sortOrder: 10
};

export const query = `
  query Query {
    setting {
      stripeDisplayName
      stripePublishableKey
      stripePaymentMode
    }
    cart: myCart {
      grandTotal {
        value
      }
      currency
    }
    returnUrl: url(routeId: "stripeReturn")
    createPaymentIntentApi: url(routeId: "createPaymentIntent")
  }
`;
