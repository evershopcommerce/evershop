import {
  commit,
  insert,
  rollback,
  startTransaction
} from '@evershop/postgres-query-builder';
import { emit } from '../../../../lib/event/emitter.js';
import { getConnection } from '../../../../lib/postgres/connection.js';
import {
  hookable,
  hookBefore,
  hookAfter
} from '../../../../lib/util/hookable.js';
import { getValue, getValueSync } from '../../../../lib/util/registry.js';
import { sanitizeRawHtml } from '../../../../lib/util/sanitizeHtml.js';
import { getAjv } from '../../../base/services/getAjv.js';
import type { BlogPost } from '../../types/index.js';
import { readingTime } from '../readingTime.js';
import blogPostDataSchema from './blogPostDataSchema.json' with { type: 'json' };

function validateBlogPostDataBeforeInsert(data: any): any {
  const ajv = getAjv();
  (blogPostDataSchema as any).required = ['name'];
  const jsonSchema = getValueSync(
    'createBlogPostDataJsonSchema',
    blogPostDataSchema,
    {}
  );
  const validate = ajv.compile(jsonSchema);
  if (validate(data)) {
    return data;
  }
  throw new Error(validate.errors[0].message);
}

async function insertBlogPostData(data: any, connection: any): Promise<BlogPost> {
  const post = await insert('blog_post').given(data).execute(connection);
  const description = await insert('blog_post_description')
    .given(data)
    .prime('blog_post_description_blog_post_id', post.insertId)
    .execute(connection);

  // Tag pivot (data.tags = array of tag ids).
  if (Array.isArray(data.tags)) {
    for (const tagId of data.tags) {
      await insert('blog_post_tag')
        .given({ post_id: post.insertId, tag_id: tagId })
        .execute(connection);
    }
  }

  return { ...description, ...post } as BlogPost;
}

/**
 * Create a blog post (spec §9.3): validate → sanitize raw HTML → compute
 * reading_time in-transaction → insert post + description + tag pivot →
 * commit → emit `blog_post_created` (subscribers build url_rewrite).
 */
const _createBlogPost = async function createBlogPost(
  data: any,
  context: any
): Promise<BlogPost> {
  const connection = await getConnection();
  await startTransaction(connection);
  try {
    const postData = await getValue('blogPostDataBeforeCreate', data);
    validateBlogPostDataBeforeInsert(postData);

    // Empty FK selects arrive as '' from the admin form; integer columns reject it.
    if (postData.category_id === '') postData.category_id = null;
    if (postData.author_id === '') postData.author_id = null;

    if (postData.description) {
      sanitizeRawHtml(postData.description);
    }
    // Reading time, computed in-transaction from the description we hold (§8).
    postData.reading_time = readingTime(postData.description);
    // Publish date — set when first published (no scheduler, §4.6).
    if (Number(postData.status) === 1 && !postData.published_at) {
      postData.published_at = new Date().toISOString();
    }

    const post = await hookable(insertBlogPostData, { ...context, connection })(
      postData,
      connection
    );

    await commit(connection);
    // Emit AFTER commit (default pool); subscribers create the url_rewrite row.
    await emit('blog_post_created', {
      blog_post_id: post.blog_post_id,
      uuid: post.uuid,
      url_key: post.url_key,
      category_id: post.category_id
    });
    return post;
  } catch (e) {
    await rollback(connection);
    throw e;
  }
};

export async function createBlogPost(data: any, context?: any): Promise<BlogPost> {
  if (context && typeof context !== 'object') {
    throw new Error('Context must be an object');
  }
  return hookable(_createBlogPost, context)(data, context);
}

export function hookBeforeCreateBlogPost(
  callback: (this: Record<string, any>, data: any, context: any) => void | Promise<void>,
  priority = 10
): void {
  hookBefore('createBlogPost', callback, priority);
}

export function hookAfterCreateBlogPost(
  callback: (this: Record<string, any>, data: any, context: any) => void | Promise<void>,
  priority = 10
): void {
  hookAfter('createBlogPost', callback, priority);
}
