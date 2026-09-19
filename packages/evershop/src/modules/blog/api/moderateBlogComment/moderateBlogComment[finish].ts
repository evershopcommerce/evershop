import { EvershopRequest } from '../../../../types/request.js';
import { EvershopResponse } from '../../../../types/response.js';
import { moderateBlogComment } from '../../services/comment/moderateBlogComment.js';

export default async (request: EvershopRequest, response: EvershopResponse) => {
  const uuid = request.params.id as string;
  const status = request.body?.status as string;
  await moderateBlogComment(uuid, status);
  return { uuid, status };
};
