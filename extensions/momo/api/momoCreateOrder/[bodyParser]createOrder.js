/* eslint-disable camelcase */
const { default: axios } = require('axios');
const { select, update } = require('@evershop/postgres-query-builder');
const { buildUrl } = require('@evershop/evershop/src/lib/router/buildUrl');
const { pool } = require('@evershop/evershop/src/lib/postgres/connection');
const {
  INVALID_PAYLOAD,
  OK,
  INTERNAL_SERVER_ERROR
} = require('@evershop/evershop/src/lib/util/httpStatus');
const { getSetting } = require('../../../../packages/evershop/src/modules/setting/services/setting');
const { toPrice } = require('../../../../packages/evershop/src/modules/checkout/services/toPrice');
const { getApiBaseUrl } = require('../../services/getApiBaseUrl');
const { getContextValue } = require('../../../../packages/evershop/src/modules/graphql/services/contextHelper');

// eslint-disable-next-line no-unused-vars
module.exports = async (request, response, stack, next) => {
  const { order_id } = request.body;

  const order = await select()
    .from('order')
    .where('uuid', '=', order_id)
    .and('payment_method', '=', 'momo')
    .and('payment_status', '=', 'pending')
    .load(pool);

  if (!order) {
    return response.status(INVALID_PAYLOAD).json({
      error: {
        status: INVALID_PAYLOAD,
        message: 'Invalid order'
      }
    });
  } else {
    const integration_order_id = order_id + new Date().getTime();
    // Build the order for createOrder API PayPal
    const orderData = {
        partnerCode: 'MOMO',
        partnerName: await getSetting('storeName', 'Test'),
        storeId : await getSetting('storeName', 'MomoTestStore'),
        requestId: integration_order_id,
        amount: toPrice(order.grand_total),
        orderId: order_id,
        orderInfo: "Thanh toán đơn hàng",
        redirectUrl: `${getContextValue(request, 'homeUrl')}${buildUrl(
          'momoReturn',
          { 
            orderId: order_id,
            requestId: integration_order_id
          }
        )}`,
        ipnUrl: "https://webhook.site/b3088a6a-2d17-4f8d-a383-71389a6c600b",
        lang: 'vi',
        requestType: await getSetting('momoRequestType', 'payWithMethod'),
        autoCapture: true,
        extraData: "",
        orderGroupId: '',
    };
    const accessKey = await getSetting('momoAccessKey', 'F8BBA842ECF85');
    const secretKey = await getSetting('momoSecretKey', 'K951B6PE1waDMi640xX08PD3vg6EkVlz');
    const rawSignature = "accessKey=" + accessKey + "&amount=" + orderData.amount + "&extraData=" + orderData.extraData + "&ipnUrl=" + orderData.ipnUrl + "&orderId=" + orderData.orderId + "&orderInfo=" + orderData.orderInfo + "&partnerCode=" + orderData.partnerCode + "&redirectUrl=" + orderData.redirectUrl + "&requestId=" + orderData.requestId + "&requestType=" + orderData.requestType;
    const crypto = require('crypto');
    var signature = crypto.createHmac('sha256', secretKey)
        .update(rawSignature)
        .digest('hex');
    orderData.signature = signature;

    // Call Momo API to create order using axios
    const { data } = await axios.post(
      `${await getApiBaseUrl()}/v2/gateway/api/create`,
      orderData,
      {
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(JSON.stringify(orderData))
        },
        validateStatus: (status) => status < 500
      }
    );
    console.log('Order data', orderData);
    console.log('Return value', data);

    if (data.orderId) {
      // Update order and insert papal order id
      await update('order')
        .given({ integration_order_id: integration_order_id })
        .where('uuid', '=', order_id)
        .execute(pool);

      response.status(OK);
      return response.json({
        data: {
          momoOrderId: data.orderId,
          approveUrl: data.payUrl
        }
      });
    } else {
      response.status(INTERNAL_SERVER_ERROR);
      return response.json({
        error: {
          status: INTERNAL_SERVER_ERROR,
          message: data.message
        }
      });
    }
  }
};
