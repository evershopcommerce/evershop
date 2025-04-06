import { buildUrl } from '@evershop/evershop/src/lib/router/buildUrl.js';
import { OK } from '@evershop/evershop/src/lib/util/httpStatus.js';

// eslint-disable-next-line no-unused-vars
export default async (request, response, delegate, next) => {
  const collection = await delegate.updateCollection;
  response.status(OK);
  response.json({
    data: {
      ...collection,
      links: [
        {
          rel: 'collectionGrid',
          href: buildUrl('collectionGrid'),
          action: 'GET',
          types: ['text/xml']
        },
        {
          rel: 'edit',
          href: buildUrl('collectionEdit', { id: collection.uuid }),
          action: 'GET',
          types: ['text/xml']
        }
      ]
    }
  });
};
