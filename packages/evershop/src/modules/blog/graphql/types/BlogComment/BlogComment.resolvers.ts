import { pool } from '../../../../../lib/postgres/connection.js';

interface CommentNode {
  uuid: string;
  name: string;
  comment: string;
  createdAt: string | null;
  likeCount: number;
  liked: boolean;
  replies: CommentNode[];
  _parent: number | null;
}

export default {
  BlogPost: {
    /**
     * All approved comments for the post, built into a reply tree in JS (avoids
     * N+1 recursive resolution). `liked` reflects the current visitor's likes.
     */
    comments: async ({ blogPostId }: any, _args: any, context: any) => {
      const rows = await pool.query(
        `SELECT blog_comment_id, uuid, parent_id, name, comment, like_count, created_at
           FROM blog_comment
          WHERE post_id=$1 AND status='approved'
          ORDER BY created_at ASC`,
        [blogPostId]
      );

      const fingerprint = context?.blogVisitor;
      let likedSet = new Set<number>();
      if (fingerprint) {
        const liked = await pool.query(
          `SELECT entity_id FROM blog_reaction
            WHERE entity_type='comment' AND fingerprint=$1`,
          [fingerprint]
        );
        likedSet = new Set(liked.rows.map((r: any) => r.entity_id));
      }

      const byId = new Map<number, CommentNode>();
      rows.rows.forEach((r: any) => {
        byId.set(r.blog_comment_id, {
          uuid: r.uuid,
          name: r.name,
          comment: r.comment,
          createdAt: r.created_at ? new Date(r.created_at).toISOString() : null,
          likeCount: r.like_count,
          liked: likedSet.has(r.blog_comment_id),
          replies: [],
          _parent: r.parent_id
        });
      });

      const roots: CommentNode[] = [];
      byId.forEach((node) => {
        if (node._parent && byId.has(node._parent)) {
          byId.get(node._parent)!.replies.push(node);
        } else {
          roots.push(node);
        }
      });
      return roots;
    }
  },
  BlogComment: {
    // Normalizes both storefront tree nodes (ISO string) and admin collection
    // rows (Date) to an ISO string.
    createdAt: ({ createdAt }: any) =>
      createdAt ? new Date(createdAt).toISOString() : null
  }
};
