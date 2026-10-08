import { OK } from '../../../../lib/util/httpStatus.js';
import { EvershopRequest } from '../../../../types/request.js';
import { EvershopResponse } from '../../../../types/response.js';
import { respondWithError } from '../../services/respondWithError.js';
import { sendTestEvent } from '../../services/sendTestEvent.js';

/**
 * Sends one `webhook_ping` now and answers with the result, so this request
 * can take up to the 10 second delivery timeout.
 */
export default async (
  request: EvershopRequest,
  response: EvershopResponse,
  next
) => {
  try {
    const result = await sendTestEvent(request.params.id as string);
    response.status(OK);
    response.json({ data: result });
  } catch (e) {
    respondWithError(response, e);
  }
};
