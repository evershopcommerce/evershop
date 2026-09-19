import { getDelegate } from '../../../../lib/middleware/delegate.js';
import { buildUrl } from '../../../../lib/router/buildUrl.js';
import { OK } from '../../../../lib/util/httpStatus.js';
import { EvershopRequest } from '../../../../types/request.js';
import { EvershopResponse } from '../../../../types/response.js';

export default async (
  request: EvershopRequest,
  response: EvershopResponse,
  next
) => {
  const tag = await getDelegate<Record<string, any>>('createBlogTag', request);
  response.status(OK);
  response.json({
    data: {
      ...tag,
      links: [
        {
          rel: 'blogTagGrid',
          href: buildUrl('blogTagGrid'),
          action: 'GET',
          types: ['text/xml']
        },
        {
          rel: 'edit',
          href: buildUrl('blogTagEdit', { id: tag?.uuid }),
          action: 'GET',
          types: ['text/xml']
        }
      ]
    }
  });
};
