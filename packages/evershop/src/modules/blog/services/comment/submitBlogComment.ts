import {
  commit,
  insert,
  rollback,
  startTransaction
} from '@evershop/postgres-query-builder';
import sanitizeHtml from 'sanitize-html';
import { pool } from '../../../../lib/postgres/connection.js';
import { getConnection } from '../../../../lib/postgres/connection.js';
import { getAjv } from '../../../base/services/getAjv.js';
import blogCommentDataSchema from './blogCommentDataSchema.json' with { type: 'json' };

/** Thrown when the post's category comment_policy is 'closed' → HTTP 403. */
export class CommentsClosedError extends Error {}

const STRICT_NO_TAGS = { allowedTags: [], allowedAttributes: {} };

/**
 * Comments are untrusted input rendered back to other visitors (stored-XSS
 * vector) — strip ALL tags, collapse whitespace, cap length. NOT
 * `sanitizeRawHtml` (that one is Editor.js-specific and permissive).
 */
function toPlainText(value: unknown, max: number): string {
  return sanitizeHtml(String(value ?? ''), STRICT_NO_TAGS)
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

export interface SubmitCommentResult {
  uuid: string;
  status: 'pending' | 'approved' | 'spam';
}

export async function submitBlogComment(data: any): Promise<SubmitCommentResult> {
  // Honeypot: bots fill the hidden `website` field. Humans never see it.
  const honeypotTripped = !!(data.website && String(data.website).trim());

  const name = toPlainText(data.name, 120);
  const comment = toPlainText(data.comment, 5000);
  const email = String(data.email ?? '').trim();

  const ajv = getAjv();
  const validate = ajv.compile(blogCommentDataSchema as any);
  const candidate = { name, email, comment, post_id: data.post_id };
  if (!validate(candidate)) {
    throw new Error(validate.errors[0].message);
  }

  // Comment policy lives on the post's category (default 'moderated' when none).
  const policyResult = await pool.query(
    `SELECT c.comment_policy
       FROM blog_post p
       LEFT JOIN blog_category c ON c.blog_category_id = p.category_id
      WHERE p.blog_post_id = $1`,
    [data.post_id]
  );
  if (policyResult.rows.length === 0) {
    throw new Error('Post not found');
  }
  const policy = policyResult.rows[0].comment_policy || 'moderated';
  if (policy === 'closed') {
    throw new CommentsClosedError('Comments are closed for this post');
  }

  let status: 'pending' | 'approved' | 'spam' =
    policy === 'open' ? 'approved' : 'pending';

  // Light spam heuristics → auto-spam (still stored, never shown).
  const linkCount = (comment.match(/https?:\/\//g) || []).length;
  if (honeypotTripped || linkCount > 3) {
    status = 'spam';
  }

  const connection = await getConnection();
  try {
    await startTransaction(connection);
    const inserted = await insert('blog_comment')
      .given({
        post_id: data.post_id,
        parent_id: data.parent_id || null,
        customer_id: data.customer_id || null,
        name,
        email,
        comment,
        status
      })
      .execute(connection);

    if (status === 'approved') {
      await connection.query(
        `UPDATE blog_post SET comment_count =
           (SELECT COUNT(*) FROM blog_comment WHERE post_id=$1 AND status='approved')
         WHERE blog_post_id=$1`,
        [data.post_id]
      );
    }

    await commit(connection);
    return { uuid: inserted.uuid, status };
  } catch (e) {
    await rollback(connection);
    throw e;
  }
}
