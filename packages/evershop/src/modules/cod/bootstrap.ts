import { emit } from '../../lib/event/emitter.js';
import { getConfig } from '../../lib/util/getConfig.js';
import { hookAfter } from '../../lib/util/hookable.js';
import { getSetting } from '../../modules/setting/services/setting.js';
import { registerPaymentMethod } from '../checkout/services/getAvailablePaymentMethods.js';
import {
  CreateOrderResult,
  SaveOrderContext
} from '../checkout/services/orderCreator.js';

export default async () => {
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
    }
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
