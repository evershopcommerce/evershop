const { getConfig } = require('../../../../../lib/util/getConfig');
const { getSetting } = require('../../../../setting/services/setting');

module.exports = async (request, response) => {
  // Check if Paypal is enabled
  const paypalConfig = getConfig('system.paypal', {});
  let paypalStatus;
  if (paypalConfig.status) {
    paypalStatus = paypalConfig.status;
  } else {
    paypalStatus = await getSetting('paypalPaymentStatus', 0);
  }
  if (parseInt(paypalStatus) === 1) {
    return {
      methodCode: 'paypal',
      methodName: await getSetting('paypalDislayName', 'Paypal')
    }
  } else {
    return;
  }
};
