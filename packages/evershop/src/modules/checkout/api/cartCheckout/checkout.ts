import { error } from '../../../../lib/log/logger.js';
import { buildUrl } from '../../../../lib/router/buildUrl.js';
import { INTERNAL_SERVER_ERROR, OK } from '../../../../lib/util/httpStatus.js';
import { CheckoutData } from '../../../../types/checkoutData.js';
import { EvershopResponse } from '../../../../types/index.js';
import { EvershopRequest } from '../../../../types/request.js';
import { checkout } from '../../services/checkout.js';

export default async (
  request: EvershopRequest,
  response: EvershopResponse,
  next
) => {
  try {
    const { cart_id } = request.params;
    const checkoutData = {
      ...request.body,
      customer: {
        email: request.body.customer.email
      }
    };
    const customer = request.getCurrentCustomer();
    if (customer) {
      checkoutData.customer = {
        id: customer.customer_id,
        email: customer.email,
        fullName: customer.full_name
      };
    }
    const order = await checkout(cart_id, checkoutData);
    response.status(OK);
    response.$body = {
      data: {
        ...order,
        links: [
          {
            rel: 'edit',
            href: buildUrl('orderEdit', { id: order.uuid }),
            action: 'GET',
            types: ['text/xml']
          }
        ]
      }
    };
    next();
  } catch (e) {
    error(e);
    response.status(INTERNAL_SERVER_ERROR);
    response.json({
      error: {
        message: e.message,
        status: INTERNAL_SERVER_ERROR
      }
    });
  }
};
