import {
  commit,
  insert,
  rollback,
  select,
  update,
  del,
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

function validateBlogPostDataBeforeUpdate(data: any): any {
  const ajv = getAjv();
  (blogPostDataSchema as any).required = [];
  const jsonSchema = getValueSync(
    'updateBlogPostDataJsonSchema',
    blogPostDataSchema,
    {}
  );
  const validate = ajv.compile(jsonSchema);
  if (validate(data)) {
    return data;
  }
  throw new Error(validate.errors[0].message);
}

async function updateBlogPostData(
  uuid: string,
  data: any,
  connection: any
): Promise<BlogPost> {
  const query = select().from('blog_post');
  query
    .leftJoin('blog_post_description')
    .on(
      'blog_post_description.blog_post_description_blog_post_id',
      '=',
      'blog_post.blog_post_id'
    );
  const post = await query.where('uuid', '=', uuid).load(connection);
  if (!post) {
    throw new Error('Requested post not found');
  }

  const newPost = await update('blog_post')
    .given(data)
    .where('uuid', '=', uuid)
    .execute(connection);
  Object.assign(post, newPost);

  let description = {};
  try {
    description = await update('blog_post_description')
      .given(data)
      .where('blog_post_description_blog_post_id', '=', post.blog_post_id)
      .execute(connection);
  } catch (e) {
    if (!e.message.includes('No data was provided')) {
      throw e;
    }
  }

  // Replace tag pivot when `tags` is supplied.
  if (Array.isArray(data.tags)) {
    await del('blog_post_tag')
      .where('post_id', '=', post.blog_post_id)
      .execute(connection);
    for (const tagId of data.tags) {
      await insert('blog_post_tag')
        .given({ post_id: post.blog_post_id, tag_id: tagId })
        .execute(connection);
    }
  }

  return { ...post, ...description } as BlogPost;
}

/**
 * Update a blog post. Recomputes reading_time when `description` is supplied;
 * stamps published_at on the first transition to published.
 */
const _updateBlogPost = async function updateBlogPost(
  uuid: string,
  data: any,
  context: any
): Promise<BlogPost> {
  const connection = await getConnection();
  await startTransaction(connection);
  try {
    const postData = await getValue('blogPostDataBeforeUpdate', data);
    validateBlogPostDataBeforeUpdate(postData);

    // Empty FK selects arrive as '' from the admin form; integer columns reject it.
    if (postData.category_id === '') postData.category_id = null;
    if (postData.author_id === '') postData.author_id = null;

    if (postData.description) {
      sanitizeRawHtml(postData.description);
      postData.reading_time = readingTime(postData.description);
    }
    if (Number(postData.status) === 1 && !postData.published_at) {
      postData.published_at = new Date().toISOString();
    }

    const post = await hookable(updateBlogPostData, { ...context, connection })(
      uuid,
      postData,
      connection
    );

    await commit(connection);
    await emit('blog_post_updated', {
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

export async function updateBlogPost(
  uuid: string,
  data: any,
  context?: any
): Promise<BlogPost> {
  if (context && typeof context !== 'object') {
    throw new Error('Context must be an object');
  }
  return hookable(_updateBlogPost, context)(uuid, data, context);
}

export function hookBeforeUpdateBlogPost(
  callback: (this: Record<string, any>, uuid: any, data: any, context: any) => void | Promise<void>,
  priority = 10
): void {
  hookBefore('updateBlogPost', callback, priority);
}

export function hookAfterUpdateBlogPost(
  callback: (this: Record<string, any>, uuid: any, data: any, context: any) => void | Promise<void>,
  priority = 10
): void {
  hookAfter('updateBlogPost', callback, priority);
}
