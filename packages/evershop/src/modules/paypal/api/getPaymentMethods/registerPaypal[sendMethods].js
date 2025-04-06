import { getConfig } from '@evershop/evershop/src/lib/util/getConfig.js';
import { getSetting } from '../../../setting/services/setting.js';

// eslint-disable-next-line no-unused-vars
export default async (request, response) => {
  // Check if Paypal is enabled
  const paypalConfig = getConfig('system.paypal', {});
  let paypalStatus;
  if (paypalConfig.status) {
    paypalStatus = paypalConfig.status;
  } else {
    paypalStatus = await getSetting('paypalPaymentStatus', 0);
  }
  if (parseInt(paypalStatus, 10) === 1) {
    return {
      methodCode: 'paypal',
      methodName: await getSetting('paypalDislayName', 'Paypal')
    };
  } else {
    return null;
  }
};
