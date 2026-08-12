import { EvershopRequest } from '../../../../types/request.js';
import { EvershopResponse } from '../../../../types/response.js';
import { updateBlogCategory } from '../../services/category/updateBlogCategory.js';

export default async (request: EvershopRequest, response: EvershopResponse) => {
  const data = request.body;
  const category = await updateBlogCategory(request.params.id as string, data, {
    routeId: request.currentRoute.id
  });

  return category;
};
