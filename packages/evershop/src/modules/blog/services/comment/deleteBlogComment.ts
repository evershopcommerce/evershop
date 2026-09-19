import {
  commit,
  rollback,
  startTransaction
} from '@evershop/postgres-query-builder';
import { getConnection } from '../../../../lib/postgres/connection.js';

/**
 * Admin delete. Replies cascade (FK parent_id ON DELETE CASCADE). Orphaned
 * `blog_reaction` rows (comment likes) are cleaned up for the comment itself.
 * comment_count is recomputed for the post.
 */
export async function deleteBlogComment(uuid: string) {
  const connection = await getConnection();
  try {
    await startTransaction(connection);
    const row = await connection.query(
      `SELECT blog_comment_id, post_id FROM blog_comment WHERE uuid=$1`,
      [uuid]
    );
    const commentId = row.rows[0]?.blog_comment_id;
    const postId = row.rows[0]?.post_id;

    if (commentId) {
      await connection.query(
        `DELETE FROM blog_reaction WHERE entity_type='comment' AND entity_id=$1`,
        [commentId]
      );
    }
    await connection.query(`DELETE FROM blog_comment WHERE uuid=$1`, [uuid]);

    if (postId) {
      await connection.query(
        `UPDATE blog_post SET comment_count =
           (SELECT COUNT(*) FROM blog_comment WHERE post_id=$1 AND status='approved')
         WHERE blog_post_id=$1`,
        [postId]
      );
    }

    await commit(connection);
    return { uuid };
  } catch (e) {
    await rollback(connection);
    throw e;
  }
}
