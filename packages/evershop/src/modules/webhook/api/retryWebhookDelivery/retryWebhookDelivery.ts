import { OK } from '../../../../lib/util/httpStatus.js';
import { EvershopRequest } from '../../../../types/request.js';
import { EvershopResponse } from '../../../../types/response.js';
import { respondWithError } from '../../services/respondWithError.js';
import { retryDelivery } from '../../services/retryDelivery.js';

export default async (
  request: EvershopRequest,
  response: EvershopResponse,
  next
) => {
  try {
    const delivery = await retryDelivery(request.params.id as string);
    response.status(OK);
    response.json({ data: delivery });
  } catch (e) {
    respondWithError(response, e);
  }
};
