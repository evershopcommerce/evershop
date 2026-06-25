import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import {
  commit,
  insert,
  insertOnUpdate,
  rollback,
  select,
  startTransaction
} from '@evershop/postgres-query-builder';
import { error, info, success } from '../../lib/log/logger.js';
import { getConnection } from '../../lib/postgres/connection.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

interface CommentSeed {
  name: string;
  email?: string;
  comment: string;
  status?: string;
  replies?: CommentSeed[];
}
interface PostSeed {
  name: string;
  url_key: string;
  status: number;
  category?: string;
  tags?: string[];
  short_description?: string;
  thumbnail?: string;
  meta_title?: string;
  meta_description?: string;
  content: any[];
  comments?: CommentSeed[];
}
interface CategorySeed {
  name: string;
  url_key: string;
  comment_policy: string;
  status: number;
  short_description?: string;
}
interface TagSeed {
  name: string;
  url_key: string;
}
interface BlogSeedData {
  categories: CategorySeed[];
  tags: TagSeed[];
  posts: PostSeed[];
}

/** Rough words-per-minute estimate; mirrors the storefront reading-time field. */
function estimateReadingTime(content: any[]): number {
  let words = 0;
  for (const row of content || []) {
    for (const col of row.columns || []) {
      for (const block of col.data?.blocks || []) {
        const d = block.data || {};
        const text = [d.text, d.caption, ...(d.items || [])]
          .filter(Boolean)
          .join(' ');
        words += text.split(/\s+/).filter(Boolean).length;
      }
    }
  }
  return Math.max(1, Math.round(words / 200));
}

const emailFor = (name: string): string =>
  `${name.toLowerCase().replace(/[^a-z0-9]+/g, '')}@example.com`;

/**
 * Seed demo blog content (categories, tags, posts, comments) from
 * `data/blog.json`. Idempotent — entities are matched by url_key and skipped if
 * they already exist. Builds the `url_rewrite` rows itself (the create-event
 * subscribers don't run during seeding).
 */
export async function seedBlog(): Promise<void> {
  info('Seeding blog...');
  const data: BlogSeedData = JSON.parse(
    readFileSync(join(__dirname, 'data', 'blog.json'), 'utf-8')
  );

  const connection = await getConnection();
  await startTransaction(connection);
  try {
    // Author = the first admin user (or NULL when none exists yet).
    const admins = await select('admin_user_id')
      .from('admin_user')
      .orderBy('admin_user_id', 'ASC')
      .execute(connection);
    const authorId: number | null = admins[0]?.admin_user_id ?? null;

    // ── Categories ──────────────────────────────────────────────────────────
    const catId: Record<string, number> = {};
    let catCreated = 0;
    for (const c of data.categories) {
      const existing = await select()
        .from('blog_category_description')
        .where('url_key', '=', c.url_key)
        .load(connection);
      if (existing) {
        catId[c.name] = (
          existing as any
        ).blog_category_description_blog_category_id;
        continue;
      }
      const cat = await insert('blog_category')
        .given({ status: c.status, comment_policy: c.comment_policy })
        .execute(connection);
      await insert('blog_category_description')
        .given({
          blog_category_description_blog_category_id: cat.blog_category_id,
          name: c.name,
          url_key: c.url_key,
          short_description: c.short_description ?? null
        })
        .execute(connection);
      await insertOnUpdate('url_rewrite', ['entity_uuid', 'language'])
        .given({
          entity_type: 'blog_category',
          entity_uuid: cat.uuid,
          request_path: `/blog/category/${c.url_key}`,
          target_path: `/blogCategory/${cat.uuid}`
        })
        .execute(connection);
      catId[c.name] = cat.blog_category_id;
      catCreated++;
    }

    // ── Tags ────────────────────────────────────────────────────────────────
    const tagId: Record<string, number> = {};
    let tagCreated = 0;
    for (const t of data.tags) {
      const existing = await select()
        .from('blog_tag')
        .where('url_key', '=', t.url_key)
        .load(connection);
      if (existing) {
        tagId[t.name] = (existing as any).blog_tag_id;
        continue;
      }
      const tag = await insert('blog_tag')
        .given({ name: t.name, url_key: t.url_key })
        .execute(connection);
      await insertOnUpdate('url_rewrite', ['entity_uuid', 'language'])
        .given({
          entity_type: 'blog_tag',
          entity_uuid: tag.uuid,
          request_path: `/blog/tag/${t.url_key}`,
          target_path: `/blogTag/${tag.uuid}`
        })
        .execute(connection);
      tagId[t.name] = tag.blog_tag_id;
      tagCreated++;
    }

    // ── Posts (+ tag pivots, comments, url_rewrite) ─────────────────────────
    let postCreated = 0;
    let postSkipped = 0;
    let commentCreated = 0;
    let dayOffset = 0;
    for (const p of data.posts) {
      const existing = await select()
        .from('blog_post_description')
        .where('url_key', '=', p.url_key)
        .load(connection);
      if (existing) {
        postSkipped++;
        continue;
      }
      // Spread published_at over recent days so the index shows a natural order.
      const publishedAt =
        p.status === 1
          ? new Date(Date.now() - dayOffset * 86400000).toISOString()
          : null;
      dayOffset += 2;

      const post = await insert('blog_post')
        .given({
          status: p.status,
          category_id: p.category ? catId[p.category] ?? null : null,
          author_id: authorId,
          thumbnail: p.thumbnail ?? null,
          reading_time: estimateReadingTime(p.content),
          published_at: publishedAt
        })
        .execute(connection);
      await insert('blog_post_description')
        .given({
          blog_post_description_blog_post_id: post.blog_post_id,
          name: p.name,
          url_key: p.url_key,
          short_description: p.short_description ?? null,
          description: JSON.stringify(p.content),
          meta_title: p.meta_title ?? null,
          meta_description: p.meta_description ?? null
        })
        .execute(connection);
      await insertOnUpdate('url_rewrite', ['entity_uuid', 'language'])
        .given({
          entity_type: 'blog_post',
          entity_uuid: post.uuid,
          request_path: `/blog/${p.url_key}`,
          target_path: `/blogPost/${post.uuid}`
        })
        .execute(connection);

      for (const tn of p.tags ?? []) {
        if (tagId[tn]) {
          await insert('blog_post_tag')
            .given({ post_id: post.blog_post_id, tag_id: tagId[tn] })
            .execute(connection);
        }
      }

      let approved = 0;
      for (const cm of p.comments ?? []) {
        const status = cm.status ?? 'approved';
        const parent = await insert('blog_comment')
          .given({
            post_id: post.blog_post_id,
            parent_id: null,
            name: cm.name,
            email: cm.email ?? emailFor(cm.name),
            comment: cm.comment,
            status
          })
          .execute(connection);
        commentCreated++;
        if (status === 'approved') approved++;
        for (const r of cm.replies ?? []) {
          const rstatus = r.status ?? 'approved';
          await insert('blog_comment')
            .given({
              post_id: post.blog_post_id,
              parent_id: parent.blog_comment_id,
              name: r.name,
              email: r.email ?? emailFor(r.name),
              comment: r.comment,
              status: rstatus
            })
            .execute(connection);
          commentCreated++;
          if (rstatus === 'approved') approved++;
        }
      }
      if (approved > 0) {
        await connection.query(
          'UPDATE blog_post SET comment_count = $1 WHERE blog_post_id = $2',
          [approved, post.blog_post_id]
        );
      }
      success(`  ✓ Created post: ${p.name} (/blog/${p.url_key})`);
      postCreated++;
    }

    await commit(connection);
    success(
      `✓ Blog seeding complete: ${catCreated} categories, ${tagCreated} tags, ` +
        `${postCreated} posts, ${commentCreated} comments` +
        (postSkipped ? ` (${postSkipped} posts skipped)` : '')
    );
  } catch (e: any) {
    await rollback(connection);
    error(`Failed to seed blog: ${e.message}`);
    throw e;
  }
}
