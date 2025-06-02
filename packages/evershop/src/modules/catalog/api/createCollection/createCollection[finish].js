import createCollection from '../../services/collection/createCollection.js';

export default async (request, response, delegate) => {
  const collection = await createCollection(request.body, {
    routeId: request.currentRoute.id
  });
  return collection;
};
