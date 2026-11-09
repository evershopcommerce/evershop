import { EvershopRequest } from '../../../../types/request.js';
import { EvershopResponse } from '../../../../types/response.js';
import { cancelJob } from '../../web/handlers.js';
import { importWeb } from '../../web/runtime.js';
import { send } from '../../web/send.js';

export default async (
  request: EvershopRequest,
  response: EvershopResponse,
  next
) => {
  const web = importWeb();
  await send(web, response, await cancelJob(web, request.params.id));
};
