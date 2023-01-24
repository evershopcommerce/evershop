const { getSetting } = require('../../setting/services/setting');

module.exports.getApiBaseUrl = async function getApiBaseUrl() {
  return await getSetting('paypalEnvironment', 'https://api-m.sandbox.paypal.com');
};
