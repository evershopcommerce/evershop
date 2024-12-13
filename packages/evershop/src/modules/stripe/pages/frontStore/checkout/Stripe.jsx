import PropTypes from 'prop-types';
import React, { useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { useCheckout } from '@components/common/context/checkout';
import StripeLogo from '@components/frontStore/stripe/StripeLogo';
import CheckoutForm from '@components/frontStore/stripe/checkout/CheckoutForm';
import RenderIfTrue from '@components/common/RenderIfTrue';
import Spinner from '@components/common/Spinner';
import { toast } from 'react-toastify';
import { _ } from '@evershop/evershop/src/lib/locale/translate';

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

function StripeApp({ stripePublishableKey, cartId, returnUrl }) {
  const [clientSecret, setClientSecret] = React.useState(null);

  useEffect(() => {
    window
      .fetch('/api/stripe/paymentIntents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ cart_id: cartId })
      })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          toast.error(_('Some error occurred. Please try again later.'));
        } else {
          setClientSecret(data.data.clientSecret);
        }
      });
  }, []);

  return (
    // eslint-disable-next-line react/jsx-filename-extension
    <>
      <RenderIfTrue condition={clientSecret}>
        <div className="App">
          <Elements
            stripe={stripeLoader(stripePublishableKey)}
            options={{ clientSecret }}
          >
            <CheckoutForm
              stripePublishableKey={stripePublishableKey}
              clientSecret={clientSecret}
              returnUrl={returnUrl}
            />
          </Elements>
        </div>
      </RenderIfTrue>
      <RenderIfTrue condition={!clientSecret}>
        <div className="flex justify-center p-5">
          <Spinner width={25} height={25} />
        </div>
      </RenderIfTrue>
    </>
  );
}

StripeApp.propTypes = {
  stripePublishableKey: PropTypes.string.isRequired,
  cartId: PropTypes.string.isRequired,
  returnUrl: PropTypes.string.isRequired
};

export default function StripeMethod({
  setting,
  checkout: { cartId },
  returnUrl
}) {
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
          <div className="mt-5">
            <StripeApp
              cartId={cartId}
              stripePublishableKey={setting.stripePublishableKey}
              returnUrl={returnUrl}
            />
          </div>
        )}
      </div>
    </div>
  );
}

StripeMethod.propTypes = {
  setting: PropTypes.shape({
    stripePublishableKey: PropTypes.string.isRequired
  }).isRequired,
  checkout: PropTypes.shape({
    cartId: PropTypes.string.isRequired
  }).isRequired,
  returnUrl: PropTypes.string.isRequired
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
    checkout {
      cartId
    }
    returnUrl: url(routeId: "stripeReturn")
  }
`;
