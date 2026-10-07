import { OK } from '../../../../lib/util/httpStatus.js';
import { EvershopRequest } from '../../../../types/request.js';
import { EvershopResponse } from '../../../../types/response.js';
import { deleteWebhook } from '../../services/deleteWebhook.js';
import { respondWithError } from '../../services/respondWithError.js';

export default async (
  request: EvershopRequest,
  response: EvershopResponse,
  next
) => {
  try {
    const webhook = await deleteWebhook(request.params.id as string);
    response.status(OK);
    response.json({ data: webhook });
  } catch (e) {
    respondWithError(response, e);
  }
};
