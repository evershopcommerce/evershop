/* eslint-disable import/order */
const { getContextValue } = require('../../../../graphql/services/contextHelper');
const { getSetting } = require('../../../../setting/services/setting');
const { default: axios } = require('axios');
const { toPrice } = require('../../../../checkout/services/toPrice');
const { buildUrl } = require('../../../../../lib/router/buildUrl');
const { select, update } = require('@evershop/mysql-query-builder');
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
  } else {
    // Build the order for createOrder API PayPal
    const items = await select()
      .from('order_item')
      .where('order_item_order_id', '=', order.order_id)
      .execute(pool);

    const orderData = {
      intent: await getSetting('paypalPaymentIntent', 'CAPTURE'),
      purchase_units: [
        {
          items: items.map((item) => {
            return {
              name: item.product_name,
              sku: item.product_sku,
              quantity: item.qty,
              unit_amount: {
                currency_code: order.currency,
                value: item.final_price
              }
            };
          }),
          amount: {
            currency_code: order.currency,
            value: toPrice(order.grand_total),
            breakdown: {
              item_total: {
                currency_code: order.currency,
                value: toPrice(order.sub_total)
              },
              shipping: {
                currency_code: order.currency,
                value: toPrice(order.shipping_fee)
              },
              tax_total: {
                currency_code: order.currency,
                value: toPrice(order.tax_amount)
              },
              discount: {
                currency_code: order.currency,
                value: toPrice(order.discount_amount)
              }
            }
          }
        },
      ],
      application_context: {
        cancel_url: `${getContextValue(request, 'homeUrl')}${buildUrl('checkout')}`,
        return_url: `${getContextValue(request, 'homeUrl')}${buildUrl('paypalReturn', { orderId: orderId })}`,
        shipping_preference: "SET_PROVIDED_ADDRESS",
        user_action: "PAY_NOW",
        brand_name: await getSetting('storeName', 'Evershop'),
      }
    };

    const shippingAddress = await select()
      .from('order_address')
      .where('order_address_id', '=', order.shipping_address_id)
      .load(pool);

    // Add shipping address
    if (shippingAddress) {
      orderData.purchase_units[0].shipping = {
        address: {
          address_line_1: shippingAddress.address_1,
          address_line_2: shippingAddress.address_2,
          // Convert province code to '2-letter ISO 3166-2' format by splitting the code by '-' and take the last part
          admin_area_1: shippingAddress.province.split('-').pop(),
          admin_area_2: shippingAddress.city,
          postal_code: shippingAddress.postcode,
          country_code: shippingAddress.country
        }
      };
    } else {
      // This is digital order, no shipping address
      orderData.purchase_units[0].shipping = {
        address: {
          address_line_1: 'No shipping address',
          address_line_2: 'No shipping address',
          admin_area_1: 'No shipping address',
          admin_area_2: 'No shipping address',
          postal_code: 'No shipping address',
          country_code: 'No shipping address'
        }
      }
    }

    const billingAddress = await select()
      .from('order_address')
      .where('order_address_id', '=', order.billing_address_id)
      .load(pool);

    // Add billing address
    if (billingAddress) {
      orderData.purchase_units[0].billing = {
        address: {
          address_line_1: billingAddress.address,
          address_line_2: billingAddress.address2,
          admin_area_1: billingAddress.province.split('-').pop(),
          admin_area_2: billingAddress.city,
          postal_code: billingAddress.postcode,
          country_code: billingAddress.country
        }
      };
    }
    console.log(orderData)
    // Call PayPal API to create order using axios
    const { data } = await axios.post(
      `${(await getApiBaseUrl())}/v2/checkout/orders`,
      orderData,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getContextValue(request, 'paypalAccessToken')}`,
        }
      }
    );

    if (data.id) {
      // Update order and insert papal order id
      await update('order')
        .given({ integration_order_id: data.id })
        .where('uuid', '=', orderId)
        .execute(pool);

      response.json({
        success: true,
        data: {
          paypalOrderId: data.id,
          approveUrl: data.links.find((link) => link.rel === 'approve').href
        }
      });
    } else {
      response.json({
        success: false,
        message: data.message
      });
    }
  }
};
