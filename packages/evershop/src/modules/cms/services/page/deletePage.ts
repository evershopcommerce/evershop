import {
  commit,
  del,
  rollback,
  select,
  startTransaction
} from '@evershop/postgres-query-builder';
import { getConnection } from '../../../../lib/postgres/connection.js';
import {
  hookable,
  hookBefore,
  hookAfter
} from '../../../../lib/util/hookable.js';
import type {
  CmsPageRow,
  CmsPageDescriptionRow
} from '../../../../types/db/index.js';

async function deletePageData(uuid, connection): Promise<void> {
  await del('cms_page').where('uuid', '=', uuid).execute(connection);
}
/**
 * Delete page service. This service will delete a page with all related data
 * @param {String} uuid
 * @param {Object} context
 */
const _deletePage = async function deletePage(
  uuid,
  context
): Promise<CmsPageRow & CmsPageDescriptionRow> {
  const connection = await getConnection();
  await startTransaction(connection);
  try {
    const query = select().from('cms_page');
    query
      .leftJoin('cms_page_description')
      .on(
        'cms_page_description.cms_page_description_cms_page_id',
        '=',
        'cms_page.cms_page_id'
      );

    const page = await query.where('uuid', '=', uuid).load(connection);
    if (!page) {
      throw new Error('Invalid page id');
    }
    await hookable(deletePageData, { ...context, page, connection })(
      uuid,
      connection
    );
    await commit(connection);
    return page;
  } catch (e) {
    await rollback(connection);
    throw e;
  }
};

export async function deletePage(
  uuid,
  context
): Promise<CmsPageRow & CmsPageDescriptionRow> {
  // Make sure the context is either not provided or is an object
  if (context && typeof context !== 'object') {
    throw new Error('Context must be an object');
  }
  const page = await hookable(_deletePage, context)(uuid, context);
  return page;
}

export function hookBeforeDeletePageData(
  callback: (
    this: Record<string, any>,
    ...args: [uuid: any, connection: any]
  ) => void | Promise<void>,
  priority: number = 10
): void {
  hookBefore('deletePageData', callback, priority);
}

export function hookAfterDeletePageData(
  callback: (
    this: Record<string, any>,
    ...args: [uuid: any, connection: any]
  ) => void | Promise<void>,
  priority: number = 10
): void {
  hookAfter('deletePageData', callback, priority);
}

export function hookBeforeDeletePage(
  callback: (
    this: Record<string, any>,
    ...args: [uuid: any, context: any]
  ) => void | Promise<void>,
  priority: number = 10
): void {
  hookBefore('deletePage', callback, priority);
}

export function hookAfterDeletePage(
  callback: (
    this: Record<string, any>,
    ...args: [uuid: any, context: any]
  ) => void | Promise<void>,
  priority: number = 10
): void {
  hookAfter('deletePage', callback, priority);
}
