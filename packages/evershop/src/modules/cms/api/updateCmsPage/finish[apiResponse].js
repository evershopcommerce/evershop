const { buildUrl } = require('../../../../lib/router/buildUrl');
const { OK } = require('../../../../lib/util/httpStatus');

module.exports = async (request, response, delegate, next) => {
  const page = await delegate.updatePage;
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
