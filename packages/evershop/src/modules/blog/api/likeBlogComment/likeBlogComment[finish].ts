import { pool } from '../../../../lib/postgres/connection.js';
import { EvershopRequest } from '../../../../types/request.js';
import { EvershopResponse } from '../../../../types/response.js';
import { likeBlogComment } from '../../services/reaction/likeBlogComment.js';
import { resolveReactor } from '../../services/reaction/resolveReactor.js';

export default async (request: EvershopRequest, response: EvershopResponse) => {
  const uuid = request.params.id as string;
  const row = await pool.query(
    `SELECT blog_comment_id FROM blog_comment WHERE uuid=$1 AND status='approved'`,
    [uuid]
  );
  const commentId = row.rows[0]?.blog_comment_id;
  if (!commentId) {
    throw new Error('Comment not found');
  }
  const fingerprint = resolveReactor(request, response, true);
  return likeBlogComment(commentId, fingerprint as string);
};
