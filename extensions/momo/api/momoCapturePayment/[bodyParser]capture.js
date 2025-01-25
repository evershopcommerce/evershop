const { select, update, insert } = require('@evershop/postgres-query-builder');
const { default: axios } = require('axios');
const { pool } = require('@evershop/evershop/src/lib/postgres/connection');
const {
  INVALID_PAYLOAD,
  OK,
  INTERNAL_SERVER_ERROR
} = require('@evershop/evershop/src/lib/util/httpStatus');
const { getApiBaseUrl } = require('../../services/getApiBaseUrl');
const { getSetting } = require('../../../../packages/evershop/src/modules/setting/services/setting');

// eslint-disable-next-line no-unused-vars
module.exports = async (request, response, delegate, next) => {
  // eslint-disable-next-line camelcase
  const { orderId, requestId } = request.body;
  // Validate the order;
  const order = await select()
    .from('order')
    .where('integration_order_id', '=', requestId)
    .load(pool);

  if (!order) {
    response.status(INVALID_PAYLOAD);
    response.json({
      error: {
        status: INVALID_PAYLOAD,
        message: 'Invalid order id'
      }
    });
  } else {
    const orderData = {
      partnerCode: "MOMO",
      requestId: requestId,
      orderId: orderId,
      lang: 'vi'
    }
    const accessKey = await getSetting('momoAccessKey', 'F8BBA842ECF85');
    const secretKey = await getSetting('momoSecretKey', 'K951B6PE1waDMi640xX08PD3vg6EkVlz');
    const rawSignature = "accessKey=" + accessKey + "&orderId=" + orderData.orderId  + "&partnerCode=" + orderData.partnerCode + "&requestId=" + orderData.requestId;
    const crypto = require('crypto');
    const signature = crypto
    .createHmac('sha256', secretKey)
    .update(rawSignature)
    .digest('hex');
    orderData.signature = signature;
    // Call Momo API to check order using axios
    const { data } = await axios.post(
      `${await getApiBaseUrl()}/v2/gateway/api/query`,
      orderData,
      {
        headers: {
            'Content-Type': 'application/json'
        },
        validateStatus: (status) => status < 500
      }
    );
    if (data.resultCode === 0) {
      // Update order status to processing
      await update('order')
        .given({ payment_status: 'paid' })
        .where('integration_order_id', '=', requestId)
        .execute(pool);
      // Add transaction data to database
      await insert('payment_transaction')
        .given({
          payment_transaction_order_id: order.order_id,
          transaction_id:
          data.transId,
          amount:
          data.amount,
          status:
          data.resultCode,
          payment_action: 'capture',
          transaction_type: 'online',
          additional_information: JSON.stringify(data.message)
        })
        .execute(pool);
      // Save order activities
      await insert('order_activity')
        .given({
          order_activity_order_id: order.order_id,
          comment: `Customer paid using Momo. Transaction ID: ${data.transId}`,
          customer_notified: 0
        })
        .execute(pool);
      response.status(OK);
      response.json({
        data: {}
      });
    } else {
      response.status(INTERNAL_SERVER_ERROR);
      response.json({
        error: {
          status: INTERNAL_SERVER_ERROR,
          message: data.message
        }
      });
    }
  }
};
