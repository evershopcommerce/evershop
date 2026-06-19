import { EvershopRequest } from '../../../../types/request.js';
import { EvershopResponse } from '../../../../types/response.js';
import createCategory from '../../services/category/createCategory.js';

export default async (request: EvershopRequest, response: EvershopResponse) => {
  const result = await createCategory(request.body, {
    routeId: request.currentRoute.id
  });
  return result;
};
