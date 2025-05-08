import { getSetting } from '../../../setting/services/setting.js';

export default async (request, response) => {
  // Check if COD is enabled
  const codStatus = await getSetting('codPaymentStatus', 0);
  if (parseInt(codStatus, 10) === 1) {
    return {
      methodCode: 'cod',
      methodName: await getSetting('codDislayName', 'Cash On Delivery')
    };
  } else {
    return null;
  }
};
