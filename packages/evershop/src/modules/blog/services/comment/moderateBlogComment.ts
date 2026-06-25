import {
  commit,
  rollback,
  startTransaction,
  update
} from '@evershop/postgres-query-builder';
import { getConnection } from '../../../../lib/postgres/connection.js';

const VALID_STATUSES = ['pending', 'approved', 'spam'];

/**
 * Admin moderation: flips a comment's status and recomputes the post's
 * approved comment_count in the same transaction.
 */
export async function moderateBlogComment(uuid: string, status: string) {
  if (!VALID_STATUSES.includes(status)) {
    throw new Error(`Invalid comment status: ${status}`);
  }
  const connection = await getConnection();
  try {
    await startTransaction(connection);
    const updated = await update('blog_comment')
      .given({ status })
      .where('uuid', '=', uuid)
      .execute(connection);

    const row = await connection.query(
      `SELECT post_id FROM blog_comment WHERE uuid=$1`,
      [uuid]
    );
    const postId = row.rows[0]?.post_id;
    if (postId) {
      await connection.query(
        `UPDATE blog_post SET comment_count =
           (SELECT COUNT(*) FROM blog_comment WHERE post_id=$1 AND status='approved')
         WHERE blog_post_id=$1`,
        [postId]
      );
    }

    await commit(connection);
    return updated;
  } catch (e) {
    await rollback(connection);
    throw e;
  }
}
