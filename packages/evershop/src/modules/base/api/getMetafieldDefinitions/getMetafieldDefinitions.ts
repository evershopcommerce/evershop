import { listMetafieldDefinitions } from '../../../../lib/metafield/index.js';
import {
  INTERNAL_SERVER_ERROR,
  INVALID_PAYLOAD,
  OK
} from '../../../../lib/util/httpStatus.js';
import { EvershopRequest } from '../../../../types/request.js';
import { EvershopResponse } from '../../../../types/response.js';

export default async (
  request: EvershopRequest,
  response: EvershopResponse,
  next
) => {
  try {
    const ownerType = request.query.ownerType as string | undefined;
    if (!ownerType) {
      response.status(INVALID_PAYLOAD);
      response.json({
        error: {
          status: INVALID_PAYLOAD,
          message: 'ownerType query parameter is required'
        }
      });
      return;
    }
    const definitions = await listMetafieldDefinitions(ownerType);
    response.status(OK);
    response.json({ data: definitions });
  } catch (e) {
    const status = (e as any).status ?? INTERNAL_SERVER_ERROR;
    response.status(status);
    response.json({ error: { status, message: (e as Error).message } });
  }
};
