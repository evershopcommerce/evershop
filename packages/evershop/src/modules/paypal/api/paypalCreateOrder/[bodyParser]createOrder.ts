import { select, update } from '@evershop/postgres-query-builder';
import type { CreateOrderRequestBody } from '@paypal/paypal-js';
import { debug, error } from '../../../../lib/log/logger.js';
import { pool } from '../../../../lib/postgres/connection.js';
import { buildUrl } from '../../../../lib/router/buildUrl.js';
import {
  INTERNAL_SERVER_ERROR,
  INVALID_PAYLOAD,
  OK
} from '../../../../lib/util/httpStatus.js';
import { getValueSync } from '../../../../lib/util/registry.js';
import { EvershopRequest } from '../../../../types/request.js';
import { EvershopResponse } from '../../../../types/response.js';
import { getContextValue } from '../../../graphql/services/contextHelper.js';
import { getSetting } from '../../../setting/services/setting.js';
import { PAYPAL_METHOD_CODES } from '../../services/paymentMethods.js';
import { buildOrderPaypalAmount } from '../../services/paypalOrderAmount.js';
import { findApprovalUrl } from '../../services/paypalPayload.js';
import { buildPaypalShipping } from '../../services/paypalShippingAddress.js';
import { createAxiosInstance } from '../../services/requester.js';

export default async (
  request: EvershopRequest,
  response: EvershopResponse,
  next
) => {
  try {
    const { order_id } = request.body;
    const order = await select()
      .from('order')
      .where('uuid', '=', order_id)
      .and('payment_method', 'IN', PAYPAL_METHOD_CODES)
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
      // Build the order for createOrder API PayPal. The payment checks
      // (return page, webhook, cron) compare against the same amount.
      const {
        built,
        amount: finalAmount,
        items
      } = await buildOrderPaypalAmount(order);
      if (!built.identityHolds) {
        debug(
          `PayPal breakdown for order ${order_id} does not sum to the grand total; sending the amount without itemization`
        );
      }

      const homeUrl = getContextValue<string>(request, 'homeUrl', '');
      const returnUrl = `${homeUrl}${buildUrl('paypalReturn', { order_id })}`;
      const cancelUrl = `${homeUrl}${buildUrl('paypalCancel', { order_id })}`;
      const brandName = await getSetting('storeName', 'Evershop');
      // Venmo has no redirect flow: the buyer approves in the JS SDK popup
      // (or QR code), so its source carries no return/cancel URLs.
      const paymentSource =
        order.payment_method === 'venmo'
          ? {
              venmo: {
                experience_context: {
                  shipping_preference: 'SET_PROVIDED_ADDRESS',
                  brand_name: brandName
                }
              }
            }
          : {
              paypal: {
                experience_context: {
                  cancel_url: cancelUrl,
                  return_url: returnUrl,
                  shipping_preference: 'SET_PROVIDED_ADDRESS',
                  user_action: 'PAY_NOW',
                  brand_name: brandName
                }
              }
            };
      const orderData = {
        intent: await getSetting('paypalPaymentIntent', 'CAPTURE'),
        purchase_units: [
          {
            // Shows up in the merchant's PayPal dashboard and blocks
            // duplicate captures of the same order at PayPal's side.
            invoice_id: order.order_number,
            items: built.items,
            amount: finalAmount
          }
        ],
        payment_source: paymentSource
      } as CreateOrderRequestBody;
      const shippingAddress = await select()
        .from('order_address')
        .where('order_address_id', '=', order.shipping_address_id)
        .load(pool);

      // Add shipping address, mapped by token (spec § 3.10).
      if (shippingAddress) {
        orderData.purchase_units[0].shipping = (await buildPaypalShipping(
          shippingAddress
        )) as any;
      } else {
        (
          Object.values(orderData.payment_source!)[0] as any
        ).experience_context.shipping_preference = 'NO_SHIPPING';
      }
      const finalPaypalOrderData = getValueSync<CreateOrderRequestBody>(
        'finalPaypalOrderData',
        orderData,
        {
          order,
          items,
          shippingAddress
        }
      );
      // Call PayPal API to create order using axios
      const axiosInstance = await createAxiosInstance(request);
      const { data } = await axiosInstance.post(
        `/v2/checkout/orders`,
        finalPaypalOrderData,
        {
          headers: {
            // Idempotency: a retried create for the same local order returns
            // the same PayPal order instead of minting a new one.
            'PayPal-Request-Id': order.uuid
          },
          validateStatus: (status) => status < 500
        }
      );

      const approveUrl = data.id ? findApprovalUrl(data.links) : undefined;
      // A Venmo order is approved in the SDK popup, so it has no approval link.
      if (data.id && (approveUrl || order.payment_method === 'venmo')) {
        // Update order and insert papal order id
        await update('order')
          .given({ integration_order_id: data.id })
          .where('uuid', '=', order_id)
          .execute(pool);

        response.status(OK);
        return response.json({
          data: {
            paypalOrderId: data.id,
            approveUrl,
            // The SDK flow lands the buyer on the same return/cancel pages the
            // redirect flow uses; PayPal appends `token` there, the SDK can't.
            returnUrl: `${returnUrl}?token=${encodeURIComponent(data.id)}`,
            cancelUrl: `${cancelUrl}?token=${encodeURIComponent(data.id)}`
          }
        });
      } else {
        debug('PayPal create order error');
        debug(data);
        // Re-active the cart
        await update('cart')
          .given({ status: true })
          .where('cart_id', '=', order.cart_id)
          .execute(pool);
        response.status(INTERNAL_SERVER_ERROR);
        return response.json({
          error: {
            status: INTERNAL_SERVER_ERROR,
            message:
              data.message ||
              'PayPal did not return an approval link for this order'
          }
        });
      }
    }
  } catch (err) {
    error(err);
    return next(err);
  }
};
