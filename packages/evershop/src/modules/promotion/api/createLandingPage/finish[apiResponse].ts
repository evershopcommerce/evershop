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
  const page = await getDelegate<Record<string, any>>(
    'createLandingPage',
    request
  );
  response.status(OK);
  response.json({
    data: {
      ...page,
      links: [
        {
          rel: 'landingPageGrid',
          href: buildUrl('landingPageGrid'),
          action: 'GET',
          types: ['text/xml']
        },
        {
          rel: 'edit',
          href: buildUrl('landingPageEdit', { id: page?.uuid }),
          action: 'GET',
          types: ['text/xml']
        },
        {
          rel: 'view',
          href: `/${page?.url_key}`,
          action: 'GET',
          types: ['text/xml']
        }
      ]
    }
  });
};
