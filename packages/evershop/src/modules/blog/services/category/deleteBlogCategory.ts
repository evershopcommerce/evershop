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
import type { BlogCategoryRow } from '../../types/index.js';

async function deleteBlogCategoryData(
  uuid: string,
  connection: any
): Promise<void> {
  await del('blog_category').where('uuid', '=', uuid).execute(connection);
}

const _deleteBlogCategory = async function deleteBlogCategory(
  uuid: string,
  context: any
): Promise<BlogCategoryRow> {
  const connection = await getConnection();
  await startTransaction(connection);
  try {
    const category = await select()
      .from('blog_category')
      .where('uuid', '=', uuid)
      .load(connection);
    if (!category) {
      throw new Error('Invalid category id');
    }
    await hookable(deleteBlogCategoryData, { ...context, category, connection })(
      uuid,
      connection
    );
    await commit(connection);
    await emit('blog_category_deleted', { uuid: category.uuid });
    return category as BlogCategoryRow;
  } catch (e) {
    await rollback(connection);
    throw e;
  }
};

export async function deleteBlogCategory(
  uuid: string,
  context?: any
): Promise<BlogCategoryRow> {
  if (context && typeof context !== 'object') {
    throw new Error('Context must be an object');
  }
  return hookable(_deleteBlogCategory, context)(uuid, context);
}

export function hookBeforeDeleteBlogCategory(
  callback: (this: Record<string, any>, uuid: any, context: any) => void | Promise<void>,
  priority = 10
): void {
  hookBefore('deleteBlogCategory', callback, priority);
}

export function hookAfterDeleteBlogCategory(
  callback: (this: Record<string, any>, uuid: any, context: any) => void | Promise<void>,
  priority = 10
): void {
  hookAfter('deleteBlogCategory', callback, priority);
}
