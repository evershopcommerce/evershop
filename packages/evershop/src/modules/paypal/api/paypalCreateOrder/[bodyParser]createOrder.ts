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
import { getPriceIncludingTax } from '../../../tax/services/taxSettings.js';
import {
  buildPaypalAmount,
  findApprovalUrl
} from '../../services/paypalPayload.js';
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
    } else {
      // Build the order for createOrder API PayPal
      const items = await select()
        .from('order_item')
        .where('order_item_order_id', '=', order.order_id)
        .execute(pool);
      const catalogPriceInclTax = getPriceIncludingTax();
      // All values ride through one builder that guarantees the breakdown
      // sums exactly to the grand total (or drops the breakdown when per-unit
      // rounding makes that impossible — a mismatched breakdown is a 422).
      const built = buildPaypalAmount(order, items, catalogPriceInclTax);
      if (!built.identityHolds) {
        debug(
          `PayPal breakdown for order ${order_id} does not sum to the grand total; sending the amount without itemization`
        );
      }

      const finalAmount = getValueSync('paypalFinalAmount', built.amount, {
        order,
        items
      });

      const homeUrl = getContextValue<string>(request, 'homeUrl', '');
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
        payment_source: {
          paypal: {
            experience_context: {
              cancel_url: `${homeUrl}${buildUrl('paypalCancel', {
                order_id
              })}`,
              return_url: `${homeUrl}${buildUrl('paypalReturn', {
                order_id
              })}`,
              shipping_preference: 'SET_PROVIDED_ADDRESS',
              user_action: 'PAY_NOW',
              brand_name: await getSetting('storeName', 'Evershop')
            }
          }
        }
      } as CreateOrderRequestBody;
      const shippingAddress = await select()
        .from('order_address')
        .where('order_address_id', '=', order.shipping_address_id)
        .load(pool);

      // Add shipping address
      if (shippingAddress) {
        const address: any = {
          address_line_1: shippingAddress.address_1,
          postal_code: shippingAddress.postcode,
          country_code: shippingAddress.country
        };
        if (shippingAddress.address_2) {
          address.address_line_2 = shippingAddress.address_2;
        }
        if (shippingAddress.city) {
          address.admin_area_2 = shippingAddress.city;
        }
        if (shippingAddress.province) {
          address.admin_area_1 = shippingAddress.province.split('-').pop();
        }
        orderData.purchase_units[0].shipping = {
          name: {
            full_name: `${shippingAddress.full_name}`
          },
          type: 'SHIPPING',
          address
        };
      } else {
        (
          orderData.payment_source.paypal as any
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
      if (data.id && approveUrl) {
        // Update order and insert papal order id
        await update('order')
          .given({ integration_order_id: data.id })
          .where('uuid', '=', order_id)
          .execute(pool);

        response.status(OK);
        return response.json({
          data: {
            paypalOrderId: data.id,
            approveUrl
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
