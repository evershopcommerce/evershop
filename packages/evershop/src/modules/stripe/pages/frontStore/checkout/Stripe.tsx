import {
  useCheckout,
  useCheckoutDispatch
} from '@components/common/context/checkout.js';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe, StripeElementsOptions } from '@stripe/stripe-js';
import React, { useEffect } from 'react';
import smallUnit from 'zero-decimal-currencies';
import { _ } from '../../../../../lib/locale/translate/_.js';
import { Cards } from '../../../components/Cards.js';
import { CheckoutForm } from '../../../components/checkout/CheckoutForm.js';

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
