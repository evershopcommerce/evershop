import { EvershopRequest } from '../../../../types/request.js';
import { EvershopResponse } from '../../../../types/response.js';
import { createBlogTag } from '../../services/tag/createBlogTag.js';

export default async (request: EvershopRequest, response: EvershopResponse) => {
  const data = request.body;
  const result = await createBlogTag(data, {
    routeId: request.currentRoute.id
  });

  return result;
};
