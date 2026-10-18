import { EvershopRequest } from '../../../../types/request.js';
import { EvershopResponse } from '../../../../types/response.js';
import { getIssues } from '../../web/handlers.js';
import { importWeb } from '../../web/runtime.js';
import { send } from '../../web/send.js';

export default async (
  request: EvershopRequest,
  response: EvershopResponse,
  next
) => {
  const web = importWeb();
  await send(
    web,
    response,
    await getIssues(web, request.params.id, request.query)
  );
};
