const { getConfig } = require('../../../../../lib/util/getConfig');
const { getSetting } = require('../../../../setting/services/setting');

module.exports = async (request, response) => {
  // Check if Stripe is enabled
  const stripeConfig = getConfig('system.stripe', {});
  let stripeStatus;
  if (stripeConfig.status) {
    stripeStatus = stripeConfig.status;
  } else {
    stripeStatus = await getSetting('stripePaymentStatus', 0);
  }
  if (parseInt(stripeStatus) === 1) {
    return {
      methodCode: 'stripe',
      methodName: await getSetting('stripeDislayName', 'Stripe')
    }
  } else {
    return;
  }
};
