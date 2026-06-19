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
  const category = await getDelegate<Record<string, any>>(
    'updateCategory',
    request
  );
  response.status(OK);
  response.json({
    data: {
      ...category,
      links: [
        {
          rel: 'categoryGrid',
          href: buildUrl('categoryGrid'),
          action: 'GET',
          types: ['text/xml']
        },
        {
          rel: 'view',
          href: buildUrl('categoryView', { uuid: category?.uuid }),
          action: 'GET',
          types: ['text/xml']
        },
        {
          rel: 'edit',
          href: buildUrl('categoryEdit', { id: category?.uuid }),
          action: 'GET',
          types: ['text/xml']
        }
      ]
    }
  });
};
