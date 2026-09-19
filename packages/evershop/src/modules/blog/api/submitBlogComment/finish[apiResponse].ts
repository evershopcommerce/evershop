import { getDelegate } from '../../../../lib/middleware/delegate.js';
import { OK } from '../../../../lib/util/httpStatus.js';
import { EvershopRequest } from '../../../../types/request.js';
import { EvershopResponse } from '../../../../types/response.js';

export default async (
  request: EvershopRequest,
  response: EvershopResponse,
  next
) => {
  const result = await getDelegate<Record<string, any>>(
    'submitBlogComment',
    request
  );
  if (result?.closed) {
    response.status(403);
    response.json({ error: { status: 403, message: result.message } });
    return;
  }
  response.status(OK);
  response.json({ data: result });
};
