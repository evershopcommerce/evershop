const { buildUrl } = require('../../../../lib/router/buildUrl');
const { OK } = require('../../../../lib/util/httpStatus');

module.exports = async (request, response, delegate, next) => {
  const collection = await delegate.createCollection;
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
