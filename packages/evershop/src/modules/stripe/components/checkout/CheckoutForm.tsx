import { useCheckout } from '@components/common/context/checkout.js';
import {
  PaymentElement,
  useElements,
  useStripe
} from '@stripe/react-stripe-js';
import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import './CheckoutForm.scss';
import RenderIfTrue from '@components/common/RenderIfTrue.js';
import Spinner from '@components/admin/Spinner.js';
import { _ } from '../../../../lib/locale/translate/_.js';
import { TestCards } from './TestCards.js';
import { useCartState } from '@components/common/context/cart.js';

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
