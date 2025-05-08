const { buildUrl } = require('../../../../lib/router/buildUrl');
const { OK } = require('../../../../lib/util/httpStatus');

module.exports = async (request, response, delegate, next) => {
  const attribute = await delegate.updateAttribute;
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
