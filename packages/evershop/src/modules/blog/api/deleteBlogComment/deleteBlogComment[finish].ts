import { EvershopRequest } from '../../../../types/request.js';
import { EvershopResponse } from '../../../../types/response.js';
import { deleteBlogComment } from '../../services/comment/deleteBlogComment.js';

export default async (request: EvershopRequest, response: EvershopResponse) => {
  const uuid = request.params.id as string;
  await deleteBlogComment(uuid);
  return { uuid };
};
