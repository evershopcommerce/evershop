import { EvershopRequest } from '../../../../types/request.js';
import { EvershopResponse } from '../../../../types/response.js';
import { updateBlogTag } from '../../services/tag/updateBlogTag.js';

export default async (request: EvershopRequest, response: EvershopResponse) => {
  const data = request.body;
  const tag = await updateBlogTag(request.params.id as string, data, {
    routeId: request.currentRoute.id
  });

  return tag;
};
