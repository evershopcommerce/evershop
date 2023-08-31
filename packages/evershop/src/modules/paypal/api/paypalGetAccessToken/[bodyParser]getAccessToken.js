const { default: axios } = require('axios');
const { select } = require('@evershop/postgres-query-builder');
const { getConfig } = require('@evershop/evershop/src/lib/util/getConfig');
const { pool } = require('@evershop/evershop/src/lib/postgres/connection');
const {
  INVALID_PAYLOAD,
  OK,
  INTERNAL_SERVER_ERROR
} = require('@evershop/evershop/src/lib/util/httpStatus');
const { getSetting } = require('../../../setting/services/setting');
const { setContextValue } = require('../../../graphql/services/contextHelper');
const { getApiBaseUrl } = require('../../services/getApiBaseUrl');

// eslint-disable-next-line no-unused-vars
module.exports = async (request, response, delegate, next) => {
  // eslint-disable-next-line camelcase
  const { order_id } = request.body;

  const order = await select()
    .from('order')
    .where('uuid', '=', order_id)
    .and('payment_method', '=', 'paypal')
    .and('payment_status', '=', 'pending')
    .load(pool);

  if (!order) {
    return response.status(INVALID_PAYLOAD).json({
      error: {
        status: INVALID_PAYLOAD,
        message: 'Invalid order'
      }
    });
  }

  const paypalConfig = getConfig('system.paypal', {});
  let clientId;
  let clientSecret;
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
    `${await getApiBaseUrl()}/v1/oauth2/token`,
    params,
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(
          `${clientId}:${clientSecret}`
        ).toString('base64')}`
      }
    }
  );

  if (paypalAccessToken.data.access_token) {
    // Save paypal access token to app level context
    setContextValue(
      request.app,
      'paypalAccessToken',
      paypalAccessToken.data.access_token
    );
    response.status(OK);
    return response.json({
      data: {
        paypalAccessToken: paypalAccessToken.data.access_token
      }
    });
  } else {
    response.status(INTERNAL_SERVER_ERROR);
    return response.json({
      error: {
        status: INTERNAL_SERVER_ERROR,
        message: response.data.error_description
      }
    });
  }
};
