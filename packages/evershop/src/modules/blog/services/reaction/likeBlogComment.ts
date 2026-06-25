import {
  commit,
  rollback,
  startTransaction
} from '@evershop/postgres-query-builder';
import { getConnection } from '../../../../lib/postgres/connection.js';

export interface LikeResult {
  likeCount: number;
  liked: boolean;
}

/**
 * Toggles a visitor's "like" on a comment (the degenerate single-type reaction).
 * `blog_comment.like_count` is recomputed from `blog_reaction` in the same
 * transaction.
 */
export async function likeBlogComment(
  commentId: number,
  fingerprint: string
): Promise<LikeResult> {
  const connection = await getConnection();
  try {
    await startTransaction(connection);

    const existing = await connection.query(
      `SELECT 1 FROM blog_reaction
       WHERE entity_type='comment' AND entity_id=$1 AND fingerprint=$2`,
      [commentId, fingerprint]
    );

    let liked: boolean;
    if (existing.rows.length > 0) {
      await connection.query(
        `DELETE FROM blog_reaction
         WHERE entity_type='comment' AND entity_id=$1 AND fingerprint=$2`,
        [commentId, fingerprint]
      );
      liked = false;
    } else {
      await connection.query(
        `INSERT INTO blog_reaction (entity_type, entity_id, reaction_type, fingerprint)
         VALUES ('comment', $1, 'like', $2)`,
        [commentId, fingerprint]
      );
      liked = true;
    }

    await connection.query(
      `UPDATE blog_comment SET like_count =
         (SELECT COUNT(*) FROM blog_reaction WHERE entity_type='comment' AND entity_id=$1)
       WHERE blog_comment_id=$1`,
      [commentId]
    );
    const result = await connection.query(
      `SELECT like_count FROM blog_comment WHERE blog_comment_id=$1`,
      [commentId]
    );

    await commit(connection);
    return { likeCount: result.rows[0]?.like_count ?? 0, liked };
  } catch (e) {
    await rollback(connection);
    throw e;
  }
}
