import PropTypes from 'prop-types';
import React, { useState, useEffect } from 'react';
import {
  PaymentElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';
import { useQuery } from 'urql';
import { useCheckout } from '@components/common/context/checkout';
import './CheckoutForm.scss';
import { Field } from '@components/common/form/Field';
import RenderIfTrue from '@components/common/RenderIfTrue';
import Spinner from '@components/common/Spinner';
import TestCards from './TestCards';

const cartQuery = `
  query Query($cartId: String) {
    cart(id: $cartId) {
      billingAddress {
        cartAddressId
        fullName
        postcode
        telephone
        country {
          name
          code
        }
        province {
          name
          code
        }
        city
        address1
        address2
      }
      shippingAddress {
        cartAddressId
        fullName
        postcode
        telephone
        country {
          name
          code
        }
        province {
          name
          code
        }
        city
        address1
        address2
      }
      customerEmail
    }
  }
`;

export default function CheckoutForm({
  stripePublishableKey,
  clientSecret,
  returnUrl
}) {
  const [cardComleted, setCardCompleted] = useState(false);
  const [error, setError] = useState(null);
  const [, setDisabled] = useState(true);
  const [showTestCard, setShowTestCard] = useState('success');
  const stripe = useStripe();
  const elements = useElements();
  const { cartId, orderId, orderPlaced, paymentMethods } = useCheckout();

  const [result] = useQuery({
    query: cartQuery,
    variables: {
      cartId
    },
    pause: orderPlaced === true
  });

  useEffect(() => {
    const pay = async () => {
      const billingAddress =
        result.data.cart.billingAddress || result.data.cart.shippingAddress;

      const submit = await elements.submit();
      if (submit.error) {
        // Show error to your customer
        setError(submit.error.message);
        return;
      }
      const payload = await stripe.confirmPayment({
        clientSecret,
        elements,
        confirmParams: {
          payment_method_data: {
            billing_details: {
              name: billingAddress.fullName,
              email: result.data.cart.customerEmail,
              phone: billingAddress.telephone,
              address: {
                line1: billingAddress.address1,
                country: billingAddress.country.code,
                state: billingAddress.province?.code,
                postal_code: billingAddress.postcode,
                city: billingAddress.city
              }
            }
          },
          return_url: `${returnUrl}?order_id=${orderId}`
        }
      });

      if (payload.error) {
        // Get the payment intent ID
        const paymentIntent = payload.error.payment_intent;
        // Redirect to the return URL with the payment intent ID
        window.location.href = `${returnUrl}?order_id=${orderId}&payment_intent=${paymentIntent.id}`;
      }
    };

    if (orderId && clientSecret) {
      pay();
    }
  }, [orderId, clientSecret, result]);

  const handleChange = (event) => {
    // Listen for changes in the CardElement
    // and display any errors as the customer types their card details
    setDisabled(event.empty);
    if (event.complete === true && !event.error) {
      setCardCompleted(true);
    }
  };

  const testSuccess = () => {
    setShowTestCard('success');
  };

  const testFailure = () => {
    setShowTestCard('failure');
  };

  if (result.error) {
    return (
      <div className="flex p-8 justify-center items-center text-critical">
        {error.message}
      </div>
    );
  }
  // Check if the selected payment method is Stripe
  const stripePaymentMethod = paymentMethods.find(
    (method) => method.code === 'stripe' && method.selected === true
  );
  if (!stripePaymentMethod) return null;

  return (
    // eslint-disable-next-line react/jsx-filename-extension
    <>
      <RenderIfTrue condition={stripe && elements}>
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
            <PaymentElement id="payment-element" onChange={handleChange} />
          </div>
          {/* Show any error that happens when processing the payment */}
          {error && (
            <div className="card-error text-critical mb-8" role="alert">
              {error}
            </div>
          )}
          <Field
            type="hidden"
            name="stripeCartComplete"
            value={cardComleted ? 1 : ''}
            validationRules={[
              {
                rule: 'notEmpty',
                message: 'Please complete the card information'
              }
            ]}
          />
        </div>
      </RenderIfTrue>
      <RenderIfTrue condition={!stripe || !elements}>
        <div className="flex justify-center p-5">
          <Spinner width={20} height={20} />
        </div>
      </RenderIfTrue>
    </>
  );
}

CheckoutForm.propTypes = {
  stripePublishableKey: PropTypes.string.isRequired,
  clientSecret: PropTypes.string.isRequired,
  returnUrl: PropTypes.string.isRequired
};
