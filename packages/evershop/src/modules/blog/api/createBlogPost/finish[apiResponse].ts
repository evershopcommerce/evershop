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
  const post = await getDelegate<Record<string, any>>(
    'createBlogPost',
    request
  );
  response.status(OK);
  response.json({
    data: {
      ...post,
      links: [
        {
          rel: 'blogPostGrid',
          href: buildUrl('blogPostGrid'),
          action: 'GET',
          types: ['text/xml']
        },
        {
          rel: 'edit',
          href: buildUrl('blogPostEdit', { id: post?.uuid }),
          action: 'GET',
          types: ['text/xml']
        }
      ]
    }
  });
};
