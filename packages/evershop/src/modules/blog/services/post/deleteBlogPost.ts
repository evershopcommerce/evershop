import {
  commit,
  del,
  rollback,
  select,
  startTransaction
} from '@evershop/postgres-query-builder';
import { emit } from '../../../../lib/event/emitter.js';
import { getConnection } from '../../../../lib/postgres/connection.js';
import {
  hookable,
  hookBefore,
  hookAfter
} from '../../../../lib/util/hookable.js';
import type { BlogPost } from '../../types/index.js';

async function deleteBlogPostData(uuid: string, connection: any): Promise<void> {
  await del('blog_post').where('uuid', '=', uuid).execute(connection);
}

/**
 * Delete a blog post (description / tag pivot / comments cascade via FK).
 * Emits `blog_post_deleted` so the url_rewrite row is removed.
 */
const _deleteBlogPost = async function deleteBlogPost(
  uuid: string,
  context: any
): Promise<BlogPost> {
  const connection = await getConnection();
  await startTransaction(connection);
  try {
    const post = await select()
      .from('blog_post')
      .where('uuid', '=', uuid)
      .load(connection);
    if (!post) {
      throw new Error('Invalid post id');
    }
    await hookable(deleteBlogPostData, { ...context, post, connection })(
      uuid,
      connection
    );
    await commit(connection);
    await emit('blog_post_deleted', { uuid: post.uuid });
    return post as BlogPost;
  } catch (e) {
    await rollback(connection);
    throw e;
  }
};

export async function deleteBlogPost(uuid: string, context?: any): Promise<BlogPost> {
  if (context && typeof context !== 'object') {
    throw new Error('Context must be an object');
  }
  return hookable(_deleteBlogPost, context)(uuid, context);
}

export function hookBeforeDeleteBlogPost(
  callback: (this: Record<string, any>, uuid: any, context: any) => void | Promise<void>,
  priority = 10
): void {
  hookBefore('deleteBlogPost', callback, priority);
}

export function hookAfterDeleteBlogPost(
  callback: (this: Record<string, any>, uuid: any, context: any) => void | Promise<void>,
  priority = 10
): void {
  hookAfter('deleteBlogPost', callback, priority);
}
