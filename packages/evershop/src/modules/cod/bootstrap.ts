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

export default async () => {
  // COD collects in cash, so a refund is handed back in person — but recording
  // it in the system (status, activity log, customer email) is still useful.
  // These statuses let the shared refund pipeline mark a COD order refunded; the
  // handler below does the offline "recording only" side.
  config.util.setModuleDefaults('oms', {
    order: {
      paymentStatus: {
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
    // Offline: there is no gateway to call. The handler just confirms; core
    // records the (offline) refund transaction, sets the status, and emits
    // `order_refunded`.
    refund: async ({ order, amount }) => ({
      transactionId: `cod-refund-${order.uuid}-${Date.now()}`,
      amount,
      offline: true
    })
  });

  hookAfter<SaveOrderContext, CreateOrderResult>(
    'createOrderFunc',
    async function EmitOrderPlacedEvent(order) {
      if (order.payment_method === 'cod') {
        await emit('order_placed', order);
      }
    }
  );
};
