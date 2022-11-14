import React from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import CheckoutForm from './CheckoutForm';

// Make sure to call loadStripe outside of a component’s render to avoid
// recreating the Stripe object on every render.
// loadStripe is initialized with your real test publishable API key.
var stripe;
const stripeLoader = (publishKey) => {
  if (!stripe) {
    stripe = stripeLoader(publishKey);
  }
  return stripe
}

export default function StripeApp({ setting }) {
  return (
    // eslint-disable-next-line react/jsx-filename-extension
    <div className="App">
      <Elements stripe={loadStripe(setting.stripePublisableKey)}>
        <CheckoutForm />
      </Elements>
    </div>
  );
}

export const layout = {
  areaId: 'checkoutPaymentMethods',
  sortOrder: 10
}

export const query = `
  query Query {
    setting {
      stripeDislayName
      stripePublisableKey
    }
  }
`