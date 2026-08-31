import { error, warning } from '../../../../lib/log/logger.js';
import { getConfig } from '../../../../lib/util/getConfig.js';
import {
  INTERNAL_SERVER_ERROR,
  INVALID_PAYLOAD,
  OK,
  SERVICE_UNAVAILABLE
} from '../../../../lib/util/httpStatus.js';
import { EvershopRequest } from '../../../../types/request.js';
import { EvershopResponse } from '../../../../types/response.js';
import { getSetting } from '../../../setting/services/setting.js';
import {
  handlePaypalWebhookEvent,
  verifyPaypalWebhookSignature
} from '../../services/paypalWebhook.js';
import { createStandaloneAxiosInstance } from '../../services/requester.js';

export default async (
  request: EvershopRequest,
  response: EvershopResponse,
  next
) => {
  try {
    const paypalConfig = getConfig('system.paypal', {}) as Record<
      string,
      unknown
    >;
    const webhookId =
      (paypalConfig.webhookId as string) ||
      (await getSetting('paypalWebhookId', ''));
    if (!webhookId) {
      warning(
        'PayPal webhook received but no webhook ID is configured (paypalWebhookId setting or system.paypal.webhookId config); event ignored'
      );
      response.status(SERVICE_UNAVAILABLE);
      response.json({
        error: {
          status: SERVICE_UNAVAILABLE,
          message: 'PayPal webhook is not configured'
        }
      });
      return;
    }
    const event = JSON.parse(request.body.toString('utf8'));
    const axiosInstance = await createStandaloneAxiosInstance();
    const verified = await verifyPaypalWebhookSignature(
      axiosInstance,
      request.headers,
      event,
      webhookId
    );
    if (!verified) {
      response.status(INVALID_PAYLOAD);
      response.json({
        error: {
          status: INVALID_PAYLOAD,
          message: 'Webhook signature verification failed'
        }
      });
      return;
    }
    await handlePaypalWebhookEvent(event, axiosInstance);
    response.status(OK);
    response.json({ data: {} });
  } catch (err) {
    error(err);
    // Non-2xx makes PayPal retry the delivery — exactly what we want for a
    // transient failure.
    response.status(INTERNAL_SERVER_ERROR);
    response.json({
      error: {
        status: INTERNAL_SERVER_ERROR,
        message: 'Internal server error'
      }
    });
  }
};
