const { getSetting } = require('../../../../setting/services/setting');
const { setContextValue } = require('../../../../graphql/services/contextHelper');
const { default: axios } = require('axios');
const { getConfig } = require('../../../../../lib/util/getConfig');
const { select } = require('@evershop/mysql-query-builder');
const { pool } = require('../../../../../lib/mysql/connection');
const { getApiBaseUrl } = require('../../../services/getApiBaseUrl');

// eslint-disable-next-line no-unused-vars
module.exports = async (request, response, stack, next) => {
  const { orderId } = request.body;

  const order = await select()
    .from('order')
    .where('uuid', '=', orderId)
    .and('payment_method', '=', 'paypal')
    .and('payment_status', '=', 'pending')
    .load(pool);

  if (!order) {
    return response.status(400).json({
      success: false,
      message: 'Invalid order id'
    });
  }

  const paypalConfig = getConfig('system.paypal', {});
  let clientId, clientSecret;
  if (paypalConfig.clientSecret) {
    clientSecret = paypalConfig.clientSecret;
  } else {
    clientSecret = await getSetting('paypalClientSecret', '');
  }

  if (paypalConfig.clientId) {
    clientId = paypalConfig.clientId;
  } else {
    clientId = await getSetting('paypalClientId', '');
  }

  const params = new URLSearchParams({ grant_type: 'client_credentials' });
  // Get paypal access token using Axios
  const paypalAccessToken = await axios.post(
    `${(await getApiBaseUrl())}/v1/oauth2/token`,
    params,
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
      }
    }
  );

  if (paypalAccessToken.data.access_token) {
    // Save paypal access token to app level context
    setContextValue(request.app, 'paypalAccessToken', paypalAccessToken.data.access_token);
    response.json({
      success: true
    });
  } else {
    response.json({
      success: false,
      message: response.data.error_description
    });
  }
};
