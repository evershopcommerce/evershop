import { EvershopRequest } from '../../../../types/request.js';
import { EvershopResponse } from '../../../../types/response.js';
import { createBlogCategory } from '../../services/category/createBlogCategory.js';

export default async (request: EvershopRequest, response: EvershopResponse) => {
  const data = request.body;
  const result = await createBlogCategory(data, {
    routeId: request.currentRoute.id
  });

  return result;
};
