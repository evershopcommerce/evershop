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
    'submitContactForm',
    request
  );
  response.status(OK);
  // `emailSent` is deliberately NOT returned. Whether the store's notification
  // went out is the merchant's problem, visible in the admin grid — a visitor
  // should never learn about the store's mail configuration, and the message is
  // safely stored either way. Spam submissions get the same shape as real ones
  // so a bot cannot tell it was filtered.
  response.json({ data: { uuid: result?.uuid } });
};
