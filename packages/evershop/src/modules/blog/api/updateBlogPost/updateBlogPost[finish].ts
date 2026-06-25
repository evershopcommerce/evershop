import { EvershopRequest } from '../../../../types/request.js';
import { EvershopResponse } from '../../../../types/response.js';
import { updateBlogPost } from '../../services/post/updateBlogPost.js';

export default async (request: EvershopRequest, response: EvershopResponse) => {
  const data = request.body;
  const post = await updateBlogPost(request.params.id as string, data, {
    routeId: request.currentRoute.id
  });

  return post;
};
