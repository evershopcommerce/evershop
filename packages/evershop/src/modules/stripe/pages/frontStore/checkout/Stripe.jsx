import PropTypes from 'prop-types';
import React from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { useCheckout } from '@components/common/context/checkout';
import StripeLogo from '@components/frontStore/stripe/StripeLogo';
import CheckoutForm from '@components/frontStore/stripe/checkout/CheckoutForm';

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

function StripeApp({ stripePublishableKey }) {
  return (
    // eslint-disable-next-line react/jsx-filename-extension
    <div className="App">
      <Elements stripe={stripeLoader(stripePublishableKey)}>
        <CheckoutForm stripePublishableKey={stripePublishableKey} />
      </Elements>
    </div>
  );
}

StripeApp.propTypes = {
  stripePublishableKey: PropTypes.string.isRequired
};

export default function StripeMethod({ setting }) {
  const checkout = useCheckout();
  const { paymentMethods, setPaymentMethods } = checkout;
  // Get the selected payment method
  const selectedPaymentMethod = paymentMethods
    ? paymentMethods.find((paymentMethod) => paymentMethod.selected)
    : undefined;

  return (
    <div>
      <div className="flex justify-start items-center gap-4">
        {(!selectedPaymentMethod ||
          selectedPaymentMethod.code !== 'stripe') && (
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setPaymentMethods((previous) =>
                previous.map((paymentMethod) => {
                  if (paymentMethod.code === 'stripe') {
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
              className="feather feather-circle"
            >
              <circle cx="12" cy="12" r="10" />
            </svg>
          </a>
        )}
        {selectedPaymentMethod && selectedPaymentMethod.code === 'stripe' && (
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
              className="feather feather-check-circle"
            >
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
        )}
        <div>
          <StripeLogo width={100} />
        </div>
      </div>
      <div>
        {selectedPaymentMethod && selectedPaymentMethod.code === 'stripe' && (
          <div>
            <StripeApp stripePublishableKey={setting.stripePublishableKey} />
          </div>
        )}
      </div>
    </div>
  );
}

StripeMethod.propTypes = {
  setting: PropTypes.shape({
    stripePublishableKey: PropTypes.string.isRequired
  }).isRequired
};

export const layout = {
  areaId: 'checkoutPaymentMethodstripe',
  sortOrder: 10
};

export const query = `
  query Query {
    setting {
      stripeDislayName
      stripePublishableKey
    }
  }
`;
