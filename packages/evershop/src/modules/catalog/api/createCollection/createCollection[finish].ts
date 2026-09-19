import { EvershopRequest } from '../../../../types/request.js';
import createCollection from '../../services/collection/createCollection.js';

export default async (request: EvershopRequest, response) => {
  const collection = await createCollection(request.body, {
    routeId: request.currentRoute.id
  });
  return collection;
};
