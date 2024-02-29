import PropTypes from 'prop-types';
import { PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import React, { useState, useEffect } from 'react';
import { useQuery } from 'urql';
import { useCheckout } from '@components/common/context/checkout';
import './CheckoutForm.scss';
import { Field } from '@components/common/form/Field';
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

const cardStyle = {
  style: {
    base: {
      color: '#737373',
      fontFamily: 'Arial, sans-serif',
      fontSmoothing: 'antialiased',
      fontSize: '16px',
      '::placeholder': {
        color: '#737373'
      }
    },
    invalid: {
      color: '#fa755a',
      iconColor: '#fa755a'
    }
  },
  hidePostalCode: true
};

export default function CheckoutForm({ stripePublishableKey }) {
  const [, setSucceeded] = useState(false);
  const [cardComleted, setCardCompleted] = useState(false);
  const [error, setError] = useState(null);
  const [, setDisabled] = useState(true);
  const [clientSecret, setClientSecret] = useState('');
  const [showTestCard, setShowTestCard] = useState('success');
  const stripe = useStripe();
  const elms = useElements();
  const { cartId, orderId, orderPlaced, paymentMethods, checkoutSuccessUrl } =
    useCheckout();

  const [result] = useQuery({
    query: cartQuery,
    variables: {
      cartId
    },
    pause: orderPlaced === true
  });

  useEffect(async () => {
    // Create PaymentIntent as soon as the order is placed
    if (orderId) {
      const {error: submitError} = await elms.submit();
      if (submitError) {
        return;
      }
		
      window
        .fetch('/api/stripe/paymentIntents', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ order_id: orderId })
        })
        .then((res) => res.json())
        .then((data) => {
          setClientSecret(data.data.clientSecret);
        });
    }
  }, [orderId]);

  useEffect(() => {
    const pay = async () => {
      const billingAddress =
        result.data.cart.billingAddress || result.data.cart.shippingAddress;
      const {error} = await stripe.confirmPayment({
        elements: elms,
		clientSecret,
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
		confirmParams: {
		  return_url: `${checkoutSuccessUrl}/${orderId}`,
		},
      });

      if (error) {
        setError(`Payment failed ${payload.error.message}`);
      }
    };

    if (orderPlaced === true && clientSecret) {
      pay();
    }
  }, [orderPlaced, clientSecret, result]);

  const handleChange = (event) => {
    // Listen for changes in the PaymentElement
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
      <p>
        Oh no...
        {error.message}
      </p>
    );
  }
  // Check if the selected payment method is Stripe
  const stripePaymentMethod = paymentMethods.find(
    (method) => method.code === 'stripe' && method.selected === true
  );
  if (!stripePaymentMethod) return null;

  return (
    // eslint-disable-next-line react/jsx-filename-extension
    <div>
      <div className="stripe-form">
        {stripePublishableKey && stripePublishableKey.startsWith('pk_test') && (
          <TestCards
            showTestCard={showTestCard}
            testSuccess={testSuccess}
            testFailure={testFailure}
          />
        )}
        <PaymentElement
          id="card-element"
          options={cardStyle}
          onChange={handleChange}
        />
      </div>
      {/* Show any error that happens when processing the payment */}
      {error && (
        <div className="card-error text-critical mb-2" role="alert">
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
  );
}

CheckoutForm.propTypes = {
  stripePublishableKey: PropTypes.string.isRequired
};
