const updateCollection = require('../../services/collection/updateCollection');

// eslint-disable-next-line no-unused-vars
module.exports = async (request, response, delegate) => {
  const collection = await updateCollection(request.params.id, request.body, {
    routeId: request.currentRoute.id
  });
  return collection;
};
