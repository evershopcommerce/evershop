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
    'deleteBlogComment',
    request
  );
  response.status(OK);
  response.json({ data: result });
};
