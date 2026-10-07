import { buildUrl } from '../../../../lib/router/buildUrl.js';
import { OK } from '../../../../lib/util/httpStatus.js';
import { EvershopRequest } from '../../../../types/request.js';
import { EvershopResponse } from '../../../../types/response.js';
import { respondWithError } from '../../services/respondWithError.js';
import { updateWebhook } from '../../services/updateWebhook.js';

export default async (
  request: EvershopRequest,
  response: EvershopResponse,
  next
) => {
  try {
    const webhook = await updateWebhook(
      request.params.id as string,
      request.body
    );
    response.status(OK);
    response.json({
      data: {
        ...webhook,
        links: [
          {
            rel: 'webhookGrid',
            href: buildUrl('webhookGrid'),
            action: 'GET',
            types: ['text/xml']
          },
          {
            rel: 'edit',
            href: buildUrl('webhookEdit', { id: webhook.uuid }),
            action: 'GET',
            types: ['text/xml']
          }
        ]
      }
    });
  } catch (e) {
    respondWithError(response, e);
  }
};
