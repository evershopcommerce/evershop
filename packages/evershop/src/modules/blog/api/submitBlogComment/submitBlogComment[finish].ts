import { pool } from '../../../../lib/postgres/connection.js';
import { EvershopRequest } from '../../../../types/request.js';
import { EvershopResponse } from '../../../../types/response.js';
import {
  CommentsClosedError,
  submitBlogComment
} from '../../services/comment/submitBlogComment.js';

export default async (request: EvershopRequest, response: EvershopResponse) => {
  const body = (request.body || {}) as Record<string, any>;

  const postRow = await pool.query(
    `SELECT blog_post_id FROM blog_post WHERE uuid=$1 AND status=1`,
    [body.post_uuid]
  );
  const postId = postRow.rows[0]?.blog_post_id;
  if (!postId) {
    throw new Error('Post not found');
  }

  let parentId: number | null = null;
  if (body.parent_uuid) {
    const parent = await pool.query(
      `SELECT blog_comment_id FROM blog_comment
       WHERE uuid=$1 AND post_id=$2 AND status='approved'`,
      [body.parent_uuid, postId]
    );
    parentId = parent.rows[0]?.blog_comment_id || null;
  }

  try {
    return await submitBlogComment({
      post_id: postId,
      parent_id: parentId,
      name: body.name,
      email: body.email,
      comment: body.comment,
      website: body.website
    });
  } catch (e) {
    if (e instanceof CommentsClosedError) {
      return { closed: true, message: e.message };
    }
    throw e;
  }
};
