import { EvershopRequest } from '../../../../types/request.js';
import { EvershopResponse } from '../../../../types/response.js';
import updateCategory from '../../services/category/updateCategory.js';

export default async (request: EvershopRequest, response: EvershopResponse) => {
  const category = await updateCategory(
    Array.isArray(request.params.id) ? request.params.id[0] : request.params.id,
    request.body,
    {
      routeId: request.currentRoute.id
    }
  );
  return category;
};
