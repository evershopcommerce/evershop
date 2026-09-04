import config from 'config';
import Stripe from 'stripe';
import smallestUnit, { display } from 'zero-decimal-currencies';
import { getConfig } from '../../lib/util/getConfig.js';
import { PaymentStatus } from '../../types/order.js';
import { registerPaymentMethod } from '../checkout/services/getAvailablePaymentMethods.js';
import { getSetting } from '../setting/services/setting.js';
import { cancelPaymentIntent } from './services/cancelPayment.js';

export default async () => {
  const stripePaymentStatus = {
    order: {
      paymentStatus: {
        stripe_authorized: {
          name: 'Authorized',
          isDefault: false,
          isCancelable: true,
          isCapturable: true,
          isVoidable: true,
          badge: 'warning'
        },
        stripe_captured: {
          name: 'Captured',
          isDefault: false,
          isCancelable: false,
          isRefundable: true,
          badge: 'success'
        },
        stripe_failed: {
          name: 'Failed',
          isDefault: false,
          isCancelable: true,
          badge: 'critical'
        },
        stripe_refunded: {
          name: 'Refunded',
          badge: 'destructive',
          isCancelable: false,
          isDefault: false
        },
        stripe_partial_refunded: {
          name: 'Partial Refunded',
          badge: 'destructive',
          isCancelable: false,
          isRefundable: true,
          isDefault: false
        }
      },
      psoMapping: {
        'stripe_authorized:*': 'processing',
        'stripe_captured:*': 'processing',
        'stripe_captured:delivered': 'completed',
        'stripe_failed:*': 'new',
        'stripe_refunded:*': 'closed',
        'stripe_partial_refunded:*': 'processing',
        'stripe_partial_refunded:delivered': 'completed'
      }
    }
  } as {
    order: {
      paymentStatus: {
        [key: string]: PaymentStatus;
      };
      psoMapping: {
        [key: string]: string;
      };
    };
  };
  config.util.setModuleDefaults('oms', stripePaymentStatus);

  registerPaymentMethod({
    init: async () => ({
      code: 'stripe',
      name: await getSetting('stripeDisplayName', 'Stripe')
    }),
    validator: async () => {
      const stripeConfig = getConfig('system.stripe', {}) ?? {};
      let stripeStatus;
      if (stripeConfig.status) {
        stripeStatus = stripeConfig.status;
      } else {
        stripeStatus = await getSetting('stripePaymentStatus', 0);
      }
      if (parseInt(stripeStatus, 10) === 1) {
        return true;
      } else {
        return false;
      }
    },
    // Capture an authorized PaymentIntent. Core (captureOrder) records the
    // capture transaction, sets the status, and logs — the handler only hits
    // Stripe and reports the captured amount.
    capture: async ({ order, transaction }) => {
      const stripeConfig = getConfig('system.stripe', {}) ?? {};
      const secretKey = stripeConfig.secretKey
        ? stripeConfig.secretKey
        : await getSetting('stripeSecretKey', '');
      if (!transaction?.transaction_id) {
        throw new Error('Missing Stripe payment intent id to capture');
      }
      const stripe = new Stripe(secretKey);
      const intent = await stripe.paymentIntents.retrieve(
        transaction.transaction_id
      );
      if (intent.status !== 'requires_capture') {
        throw new Error(
          'Payment intent is not in a capturable state (requires_capture)'
        );
      }
      const captured = await stripe.paymentIntents.capture(
        transaction.transaction_id
      );
      return {
        transactionId: captured.id,
        amount: parseFloat(
          display(captured.amount_received ?? captured.amount, order.currency)
        ),
        raw: captured
      };
    },
    // Release an uncaptured authorization. Core calls this from cancelOrder when
    // a voidable order is canceled; the handler cancels the PaymentIntent.
    void: async ({ order }) => {
      await cancelPaymentIntent(order.order_id);
    },
    // The one gateway-specific step: hit Stripe and report what it moved. Core
    // (refundOrder → recordRefund) records the transaction, decides full vs
    // partial, sets the status, and emits `order_refunded`.
    refund: async ({ order, amount, transaction }) => {
      const stripeConfig = getConfig('system.stripe', {}) ?? {};
      const secretKey = stripeConfig.secretKey
        ? stripeConfig.secretKey
        : await getSetting('stripeSecretKey', '');
      if (!transaction.transaction_id) {
        throw new Error('Missing Stripe capture transaction id to refund');
      }
      const stripe = new Stripe(secretKey);
      const refund = await stripe.refunds.create({
        payment_intent: transaction.transaction_id,
        amount: parseInt(smallestUnit(amount, order.currency), 10)
      });
      return {
        transactionId: refund.id,
        amount: parseFloat(display(refund.amount, order.currency)),
        raw: refund
      };
    }
  });
};
