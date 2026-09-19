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
  const product = await getDelegate<Record<string, any>>(
    'updateProduct',
    request
  );
  response.status(OK);
  response.json({
    data: {
      ...product,
      links: [
        {
          rel: 'productGrid',
          href: buildUrl('productGrid'),
          action: 'GET',
          types: ['text/xml']
        },
        {
          rel: 'view',
          href: buildUrl('productView', { uuid: product?.uuid }),
          action: 'GET',
          types: ['text/xml']
        },
        {
          rel: 'edit',
          href: buildUrl('productEdit', { id: product?.uuid }),
          action: 'GET',
          types: ['text/xml']
        }
      ]
    }
  });
};
