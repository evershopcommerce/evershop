import { buildUrl } from '../../../../lib/router/buildUrl.js';
import { OK } from '../../../../lib/util/httpStatus.js';

// eslint-disable-next-line no-unused-vars
export default async (request, response, delegate, next) => {
  const widget = await delegate.createWidget;
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
