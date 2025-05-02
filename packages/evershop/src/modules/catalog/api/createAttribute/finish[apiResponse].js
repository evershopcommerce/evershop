import { buildUrl } from '../../../../lib/router/buildUrl.js';
import { OK } from '../../../../lib/util/httpStatus.js';

// eslint-disable-next-line no-unused-vars
export default async (request, response, delegate, next) => {
  const attribute = await delegate.createAttribute;
  response.status(OK);
  response.json({
    data: {
      ...attribute,
      links: [
        {
          rel: 'attributeGrid',
          href: buildUrl('attributeGrid'),
          action: 'GET',
          types: ['text/xml']
        },
        {
          rel: 'edit',
          href: buildUrl('attributeEdit', { id: attribute.uuid }),
          action: 'GET',
          types: ['text/xml']
        }
      ]
    }
  });
};
