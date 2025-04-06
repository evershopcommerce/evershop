import { buildUrl } from '@evershop/evershop/src/lib/router/buildUrl.js';
import { OK } from '@evershop/evershop/src/lib/util/httpStatus.js';

// eslint-disable-next-line no-unused-vars
export default async (request, response, delegate, next) => {
  const product = await delegate.updateProduct;
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
