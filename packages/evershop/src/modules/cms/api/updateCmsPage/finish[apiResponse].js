import { getDelegate } from '../../../../lib/middleware/delegate.js';
import { buildUrl } from '../../../../lib/router/buildUrl.js';
import { OK } from '../../../../lib/util/httpStatus.js';

export default async (request, response, next) => {
  const page = await getDelegate('updatePage', request);
  response.status(OK);
  response.json({
    data: {
      ...page,
      links: [
        {
          rel: 'cmsPageGrid',
          href: buildUrl('cmsPageGrid'),
          action: 'GET',
          types: ['text/xml']
        },
        {
          rel: 'edit',
          href: buildUrl('cmsPageEdit', { id: page.uuid }),
          action: 'GET',
          types: ['text/xml']
        },
        {
          rel: 'view',
          href: buildUrl('cmsPageView', { url_key: page.url_key }),
          action: 'GET',
          types: ['text/xml']
        }
      ]
    }
  });
};
