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
import type { BlogTagRow } from '../../types/index.js';

async function deleteBlogTagData(uuid: string, connection: any): Promise<void> {
  await del('blog_tag').where('uuid', '=', uuid).execute(connection);
}

const _deleteBlogTag = async function deleteBlogTag(
  uuid: string,
  context: any
): Promise<BlogTagRow> {
  const connection = await getConnection();
  await startTransaction(connection);
  try {
    const tag = await select()
      .from('blog_tag')
      .where('uuid', '=', uuid)
      .load(connection);
    if (!tag) {
      throw new Error('Invalid tag id');
    }
    await hookable(deleteBlogTagData, { ...context, tag, connection })(
      uuid,
      connection
    );
    await commit(connection);
    await emit('blog_tag_deleted', { uuid: tag.uuid });
    return tag as BlogTagRow;
  } catch (e) {
    await rollback(connection);
    throw e;
  }
};

export async function deleteBlogTag(uuid: string, context?: any): Promise<BlogTagRow> {
  if (context && typeof context !== 'object') {
    throw new Error('Context must be an object');
  }
  return hookable(_deleteBlogTag, context)(uuid, context);
}

export function hookBeforeDeleteBlogTag(
  callback: (this: Record<string, any>, uuid: any, context: any) => void | Promise<void>,
  priority = 10
): void {
  hookBefore('deleteBlogTag', callback, priority);
}

export function hookAfterDeleteBlogTag(
  callback: (this: Record<string, any>, uuid: any, context: any) => void | Promise<void>,
  priority = 10
): void {
  hookAfter('deleteBlogTag', callback, priority);
}
