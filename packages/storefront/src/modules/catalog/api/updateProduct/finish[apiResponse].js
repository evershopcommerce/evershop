import { getDelegate } from '../../../../lib/middleware/delegate.js';
import { buildUrl } from '../../../../lib/router/buildUrl.js';
import { OK } from '../../../../lib/util/httpStatus.js';

export default async (request, response, next) => {
  const product = await getDelegate('updateProduct', request);
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
          href: buildUrl('productView', { uuid: product.uuid }),
          action: 'GET',
          types: ['text/xml']
        },
        {
          rel: 'edit',
          href: buildUrl('productEdit', { id: product.uuid }),
          action: 'GET',
          types: ['text/xml']
        }
      ]
    }
  });
};
