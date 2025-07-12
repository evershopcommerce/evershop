import { getConfig } from '../../lib/util/getConfig.js';
import { addProcessor } from '../../lib/util/registry.js';
import { getSetting } from '../../modules/setting/services/setting.js';
import { registerPaymentMethod } from '../checkout/services/getAvailablePaymentMethos.js';

export default async () => {
  registerPaymentMethod({
    init: async () => ({
      methodCode: 'cod',
      methodName: await getSetting('codDisplayName', 'Cash on Delivery')
    }),
    validator: async () => {
      const codConfig = getConfig('system.cod', {});
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
};
