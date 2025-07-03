import { getDelegate } from '../../../../lib/middleware/delegate.js';
import { buildUrl } from '../../../../lib/router/buildUrl.js';
import { OK } from '../../../../lib/util/httpStatus.js';

export default async (request, response, next) => {
  const widget = await getDelegate('updateWidget', request);
  response.status(OK);
  response.json({
    data: {
      ...widget,
      links: [
        {
          rel: 'widgetGrid',
          href: buildUrl('widgetGrid'),
          action: 'GET',
          types: ['text/xml']
        },
        {
          rel: 'edit',
          href: buildUrl('widgetEdit', { id: widget.uuid }),
          action: 'GET',
          types: ['text/xml']
        }
      ]
    }
  });
};
