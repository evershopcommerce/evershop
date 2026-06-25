import { EvershopRequest } from '../../../../types/request.js';
import { EvershopResponse } from '../../../../types/response.js';
import { createBlogPost } from '../../services/post/createBlogPost.js';

export default async (request: EvershopRequest, response: EvershopResponse) => {
  const data = request.body;
  const result = await createBlogPost(data, {
    routeId: request.currentRoute.id
  });

  return result;
};
