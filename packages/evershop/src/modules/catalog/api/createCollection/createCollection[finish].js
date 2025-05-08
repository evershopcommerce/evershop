const createCollection = require('../../services/collection/createCollection');

module.exports = async (request, response, delegate) => {
  const collection = await createCollection(request.body, {
    routeId: request.currentRoute.id
  });
  return collection;
};
