import updateCollection from '../../services/collection/updateCollection.js';

export default async (request, response, delegate) => {
  const collection = await updateCollection(request.params.id, request.body, {
    routeId: request.currentRoute.id
  });
  return collection;
};
