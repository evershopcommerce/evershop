import { EvershopRequest } from '../../../../types/request.js';
import { EvershopResponse } from '../../../../types/response.js';
import updateCollection from '../../services/collection/updateCollection.js';

export default async (request: EvershopRequest, response: EvershopResponse) => {
  const collection = await updateCollection(
    Array.isArray(request.params.id) ? request.params.id[0] : request.params.id,
    request.body,
    {
      routeId: request.currentRoute.id
    }
  );
  return collection;
};
