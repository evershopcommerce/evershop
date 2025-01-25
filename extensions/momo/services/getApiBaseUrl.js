const { getSetting } = require('../../../packages/evershop/src/modules/setting/services/setting');

module.exports.getApiBaseUrl = async function getApiBaseUrl() {
  const url = await getSetting(
    'momoEnvironment',
    'https://test-payment.momo.vn'
  );
  return url;
};
