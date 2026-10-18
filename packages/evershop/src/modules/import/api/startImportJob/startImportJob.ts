import { EvershopRequest } from '../../../../types/request.js';
import { EvershopResponse } from '../../../../types/response.js';
import { startJob } from '../../web/handlers.js';
import { importWeb } from '../../web/runtime.js';
import { send } from '../../web/send.js';

export default async (
  request: EvershopRequest,
  response: EvershopResponse,
  next
) => {
  const web = importWeb();
  await send(web, response, await startJob(web, request.params.id));
};
