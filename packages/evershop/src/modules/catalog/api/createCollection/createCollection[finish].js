const createCollection = require('../../services/collection/createCollection');

// eslint-disable-next-line no-unused-vars
module.exports = async (request, response, delegate) => {
  const collection = await createCollection(request.body, {
    routeId: request.currentRoute.id
  });
  return collection;
};
