import { deleteMetafieldDefinition } from '../../../../lib/metafield/index.js';
import {
  INTERNAL_SERVER_ERROR,
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
    const uuid = request.params.uuid as string;
    await deleteMetafieldDefinition(uuid);
    response.status(OK);
    response.json({ data: { uuid } });
  } catch (e) {
    const status = (e as any).status ?? INTERNAL_SERVER_ERROR;
    response.status(status);
    response.json({ error: { status, message: (e as Error).message } });
  }
};
