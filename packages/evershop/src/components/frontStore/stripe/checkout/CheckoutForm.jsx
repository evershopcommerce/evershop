import {
  useCheckout,
  useCheckoutDispatch
} from '@components/common/context/checkout';
import {
  PaymentElement,
  useElements,
  useStripe
} from '@stripe/react-stripe-js';
import PropTypes from 'prop-types';
import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { useQuery } from 'urql';

import './CheckoutForm.scss';
import RenderIfTrue from '@components/common/RenderIfTrue';
import Spinner from '@components/common/Spinner';
import { _ } from '../../../../lib/locale/translate/_.js';
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
  createPaymentIntentApi,
  returnUrl
}) {
  const [clientSecret, setClientSecret] = React.useState(null);
  const [showTestCard, setShowTestCard] = useState('success');
  const stripe = useStripe();
  const elements = useElements();
  const { steps, cartId, orderId, orderPlaced, paymentMethods } = useCheckout();
  const { placeOrder, setError } = useCheckoutDispatch();

  const [result] = useQuery({
    query: cartQuery,
    variables: {
      cartId
    },
    pause: orderPlaced === true
  });

  useEffect(() => {
    const pay = async () => {
      const submit = await elements.submit();
      if (submit.error) {
        setError(submit.error.message);
        return;
      }
      // Place the order
      await placeOrder();
    };
    // If all steps are completed, submit the payment
    if (steps.every((step) => step.isCompleted)) {
      pay();
    }
  }, [steps]);

  useEffect(() => {
    if (orderId && orderPlaced) {
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
  }, [orderId]);

  useEffect(() => {
    const confirmPayment = async () => {
      const billingAddress =
        result.data.cart.billingAddress || result.data.cart.shippingAddress;
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

  if (result.error) {
    return (
      <div className="flex p-8 justify-center items-center text-critical">
        {result.error.message}
      </div>
    );
  }
  // Check if the selected payment method is Stripe
  const stripePaymentMethod = paymentMethods.find(
    (method) => method.code === 'stripe' && method.selected === true
  );
  if (!stripePaymentMethod) {
    return null;
  }
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
        <div className="flex justify-center p-5">
          <Spinner width={20} height={20} />
        </div>
      </RenderIfTrue>
    </>
  );
}

CheckoutForm.propTypes = {
  stripePublishableKey: PropTypes.string.isRequired,
  returnUrl: PropTypes.string.isRequired,
  createPaymentIntentApi: PropTypes.string.isRequired
};
