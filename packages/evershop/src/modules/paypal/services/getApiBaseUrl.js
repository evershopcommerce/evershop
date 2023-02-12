const { getSetting } = require('../../setting/services/setting');

module.exports.getApiBaseUrl = async function getApiBaseUrl() {
  const url = await getSetting(
    'paypalEnvironment',
    'https://api-m.sandbox.paypal.com'
  );
  return url;
};
