import { EvershopRequest } from '../../../../types/request.js';
import { EvershopResponse } from '../../../../types/response.js';
import { importWeb } from '../../web/runtime.js';
import { send } from '../../web/send.js';
import { uploadJob } from '../../web/upload.js';

export default async (
  request: EvershopRequest,
  response: EvershopResponse,
  next
) => {
  const web = importWeb();
  const admin = request.getCurrentUser();
  await send(
    web,
    response,
    await uploadJob(web, request, response, admin?.admin_user_id ?? null)
  );
};
