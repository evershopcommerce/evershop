import { pool } from '../../../../lib/postgres/connection.js';
import { EvershopRequest } from '../../../../types/request.js';
import { EvershopResponse } from '../../../../types/response.js';
import { isValidReactionType } from '../../services/reaction/reactionTypes.js';
import { reactToBlogPost } from '../../services/reaction/reactToBlogPost.js';
import { resolveReactor } from '../../services/reaction/resolveReactor.js';

export default async (request: EvershopRequest, response: EvershopResponse) => {
  const type = request.body?.type;
  if (!isValidReactionType(type)) {
    throw new Error('Invalid reaction type');
  }
  const uuid = request.params.id as string;
  const postRow = await pool.query(
    `SELECT blog_post_id FROM blog_post WHERE uuid=$1 AND status=1`,
    [uuid]
  );
  const postId = postRow.rows[0]?.blog_post_id;
  if (!postId) {
    throw new Error('Post not found');
  }
  // Write path → issue the visitor cookie if absent.
  const fingerprint = resolveReactor(request, response, true);
  return reactToBlogPost(postId, type, fingerprint as string);
};
