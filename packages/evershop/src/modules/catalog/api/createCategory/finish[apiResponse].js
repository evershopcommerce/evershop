import { buildUrl } from '@evershop/evershop/src/lib/router/buildUrl.js';
import { OK } from '@evershop/evershop/src/lib/util/httpStatus.js';

// eslint-disable-next-line no-unused-vars
export default async (request, response, delegate, next) => {
  const category = await delegate.createCategory;
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
          href: buildUrl('categoryView', { uuid: category.uuid }),
          action: 'GET',
          types: ['text/xml']
        },
        {
          rel: 'edit',
          href: buildUrl('categoryEdit', { id: category.uuid }),
          action: 'GET',
          types: ['text/xml']
        }
      ]
    }
  });
};
