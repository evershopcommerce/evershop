import config from 'config';
import { emit } from '../../lib/event/emitter.js';
import { getConfig } from '../../lib/util/getConfig.js';
import { hookAfter } from '../../lib/util/hookable.js';
import { getSetting } from '../../modules/setting/services/setting.js';
import { PaymentStatus } from '../../types/order.js';
import { registerPaymentMethod } from '../checkout/services/getAvailablePaymentMethods.js';
import {
  CreateOrderResult,
  SaveOrderContext
} from '../checkout/services/orderCreator.js';
import { addPaymentTransaction } from '../oms/services/addPaymentTransaction.js';
import { updatePaymentStatus } from '../oms/services/updatePaymentStatus.js';

export default async () => {
  // COD is offline: there is no gateway to authorize, capture, or refund
  // against — every money movement is recorded, not called out to a provider.
  // The status lifecycle still mirrors a card method's so the shared payment
  // pipeline (capture button, refund button, order-status derivation) works
  // uniformly:
  //   cod_pending  → placed, cash NOT collected yet. Capturable — here "capture"
  //                  means the merchant recording that the cash was received.
  //   cod_captured → cash collected (Paid). Refundable.
  //   cod_(partial_)refunded → cash handed back, recorded offline.
  // `cod_pending` is COD-specific (not the shared `pending`) on purpose: the
  // capture action is gated on the status flag, so a not-yet-authorized card
  // order sitting in the shared `pending` must not offer "Capture".
  config.util.setModuleDefaults('oms', {
    order: {
      paymentStatus: {
        cod_pending: {
          name: 'Pending',
          badge: 'default',
          isDefault: false,
          isCancelable: true,
          isCapturable: true
        },
        cod_captured: {
          name: 'Paid',
          badge: 'success',
          isDefault: false,
          isCancelable: false,
          isRefundable: true
        },
        cod_refunded: {
          name: 'Refunded',
          badge: 'destructive',
          isDefault: false,
          isCancelable: false,
          isRefundable: false
        },
        cod_partial_refunded: {
          name: 'Partial Refunded',
          badge: 'destructive',
          isDefault: false,
          isCancelable: false,
          isRefundable: true
        }
      },
      psoMapping: {
        'cod_pending:pending': 'new',
        'cod_pending:*': 'processing',
        'cod_captured:*': 'processing',
        'cod_captured:delivered': 'completed',
        'cod_refunded:*': 'closed',
        'cod_partial_refunded:*': 'processing',
        'cod_partial_refunded:delivered': 'completed'
      }
    }
  } as {
    order: {
      paymentStatus: Record<string, PaymentStatus>;
      psoMapping: Record<string, string>;
    };
  });

  registerPaymentMethod({
    init: async () => ({
      code: 'cod',
      name: await getSetting('codDisplayName', 'Cash on Delivery')
    }),
    validator: async () => {
      const codConfig = getConfig('system.cod', {}) as { status?: number };
      let codStatus;
      if (codConfig.status) {
        codStatus = codConfig.status;
      } else {
        codStatus = await getSetting('codPaymentStatus', 0);
      }
      if (parseInt(codStatus, 10) === 1) {
        return true;
      } else {
        return false;
      }
    },
    // Offline capture: no gateway to settle. Core records the (offline) capture
    // transaction and moves the status to `cod_captured`; the handler just
    // reports the collected amount. This is the merchant marking "cash received".
    capture: async ({ order }) => ({
      transactionId: `cod-capture-${order.uuid}-${Date.now()}`,
      amount: Number(order.grand_total),
      offline: true
    }),
    // Offline refund: no gateway to call. Core records the (offline) refund
    // transaction, sets the status, and emits `order_refunded`.
    refund: async ({ order, amount }) => ({
      transactionId: `cod-refund-${order.uuid}-${Date.now()}`,
      amount,
      offline: true
    })
  });

  // A COD order is created in the shared `pending` status (the global default).
  // Right after it is saved — still inside the creation transaction — move it
  // into `cod_pending` and record an offline `authorize` transaction for the
  // amount to be collected. `captureOrder` settles THAT authorization when the
  // merchant records the cash. Running in-transaction keeps it atomic with order
  // creation: a failure rolls the whole order back instead of leaving a
  // half-initialized COD order that can never be captured.
  hookAfter<SaveOrderContext, CreateOrderResult>(
    'saveOrder',
    async function CodInitializePayment(order, _cart, connection) {
      if (order.payment_method !== 'cod') {
        return;
      }
      await addPaymentTransaction(
        connection,
        order.insertId,
        Number(order.grand_total),
        `cod-authorize-${order.uuid}`,
        'offline',
        'authorize'
      );
      await updatePaymentStatus(order.insertId, 'cod_pending', connection);
    }
  );

  hookAfter<SaveOrderContext, CreateOrderResult>(
    'createOrderFunc',
    async function EmitOrderPlacedEvent(order) {
      if (order.payment_method === 'cod') {
        await emit('order_placed', order);
      }
    }
  );
};
