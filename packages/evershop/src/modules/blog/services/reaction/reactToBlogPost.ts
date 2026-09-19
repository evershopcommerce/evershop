import {
  commit,
  rollback,
  startTransaction
} from '@evershop/postgres-query-builder';
import { getConnection } from '../../../../lib/postgres/connection.js';

export interface ReactResult {
  counts: Record<string, number>;
  reacted: string | null;
}

/**
 * Toggles/switches a visitor's reaction on a post. A visitor holds at most one
 * reaction per post (UNIQUE key omits reaction_type): same type → remove, a new
 * type → switch. `reaction_counts` is recomputed from `blog_reaction` (the
 * source of truth) in the same transaction.
 */
export async function reactToBlogPost(
  postId: number,
  reactionType: string,
  fingerprint: string
): Promise<ReactResult> {
  const connection = await getConnection();
  try {
    await startTransaction(connection);

    const existing = await connection.query(
      `SELECT reaction_type FROM blog_reaction
       WHERE entity_type='post' AND entity_id=$1 AND fingerprint=$2`,
      [postId, fingerprint]
    );

    let reacted: string | null;
    if (existing.rows.length > 0) {
      if (existing.rows[0].reaction_type === reactionType) {
        await connection.query(
          `DELETE FROM blog_reaction
           WHERE entity_type='post' AND entity_id=$1 AND fingerprint=$2`,
          [postId, fingerprint]
        );
        reacted = null;
      } else {
        await connection.query(
          `UPDATE blog_reaction SET reaction_type=$3
           WHERE entity_type='post' AND entity_id=$1 AND fingerprint=$2`,
          [postId, fingerprint, reactionType]
        );
        reacted = reactionType;
      }
    } else {
      await connection.query(
        `INSERT INTO blog_reaction (entity_type, entity_id, reaction_type, fingerprint)
         VALUES ('post', $1, $2, $3)`,
        [postId, reactionType, fingerprint]
      );
      reacted = reactionType;
    }

    await connection.query(
      `UPDATE blog_post SET reaction_counts = COALESCE(
         (SELECT jsonb_object_agg(reaction_type, c) FROM
            (SELECT reaction_type, COUNT(*) c FROM blog_reaction
             WHERE entity_type='post' AND entity_id=$1 GROUP BY reaction_type) t),
         '{}'::jsonb)
       WHERE blog_post_id=$1`,
      [postId]
    );
    const result = await connection.query(
      `SELECT reaction_counts FROM blog_post WHERE blog_post_id=$1`,
      [postId]
    );

    await commit(connection);
    return { counts: result.rows[0]?.reaction_counts || {}, reacted };
  } catch (e) {
    await rollback(connection);
    throw e;
  }
}
