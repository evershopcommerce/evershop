import {
  commit,
  insert,
  rollback,
  startTransaction
} from '@evershop/postgres-query-builder';
import { getConnection } from '../../../../lib/postgres/connection.js';
import { hookable, hookBefore, hookAfter } from '../../../../lib/util/hookable.js';
import {
  getValue,
  getValueSync
} from '../../../../lib/util/registry.js';
import { sanitizeRawHtml } from '../../../../lib/util/sanitizeHtml.js';
import type { CmsPageRow, CmsPageDescriptionRow } from '../../../../types/db/index.js';
import { getAjv } from '../../../base/services/getAjv.js';
import pageDataSchema from './pageDataSchema.json' with { type: 'json' };

function validatePageDataBeforeInsert(data): any {
  const ajv = getAjv();
  pageDataSchema.required = [
    'status',
    'name',
    'url_key',
    'content',
    'meta_title'
  ];
  const jsonSchema = getValueSync('createPageDataJsonSchema', pageDataSchema, {});
  const validate = ajv.compile(jsonSchema);
  const valid = validate(data);
  if (valid) {
    return data;
  } else {
    throw new Error(validate.errors[0].message);
  }
}

async function insertPageData(data, connection): Promise<CmsPageRow & CmsPageDescriptionRow> {
  const page = await insert('cms_page').given(data).execute(connection);
  const description = await insert('cms_page_description')
    .given(data)
    .prime('cms_page_description_cms_page_id', page.insertId)
    .execute(connection);

  return {
    ...description,
    ...page
  };
}

/**
 * Create page service. This service will create a page with all related data
 * @param {Object} data
 * @param {Object} context
 */
const _createPage = async function createPage(data, context): Promise<CmsPageRow & CmsPageDescriptionRow> {
  const connection = await getConnection();
  await startTransaction(connection);
  try {
    const pageData = await getValue('pageDataBeforeCreate', data);
    // Validate page data
    validatePageDataBeforeInsert(pageData);
// Sanitize raw HTML blocks in EditorJS content
    if (pageData.content) {
      sanitizeRawHtml(pageData.content);
    }
    // Insert page data
    const page = await hookable(insertPageData, { ...context, connection })(
      pageData,
      connection
    );

    await commit(connection);
    return page;
  } catch (e) {
    await rollback(connection);
    throw e;
  }
}

export async function createPage(data, context): Promise<CmsPageRow & CmsPageDescriptionRow> {
  // Make sure the context is either not provided or is an object
  if (context && typeof context !== 'object') {
    throw new Error('Context must be an object');
  }
  const page = await hookable(_createPage, context)(data, context);
  return page;
};

export function hookBeforeInsertPageData(
  callback: (
    this: Record<string, any>,
    ...args: [
    data: any,
    connection: any
    ]
  ) => void | Promise<void>,
  priority: number = 10
): void {
  hookBefore('insertPageData', callback, priority);
}

export function hookAfterInsertPageData(
  callback: (
    this: Record<string, any>,
    ...args: [
    data: any,
    connection: any
    ]
  ) => void | Promise<void>,
  priority: number = 10
): void {
  hookAfter('insertPageData', callback, priority);
}

export function hookBeforeCreatePage(
  callback: (
    this: Record<string, any>,
    ...args: [
    data: any,
    context: any
    ]
  ) => void | Promise<void>,
  priority: number = 10
): void {
  hookBefore('createPage', callback, priority);
}

export function hookAfterCreatePage(
  callback: (
    this: Record<string, any>,
    ...args: [
    data: any,
    context: any
    ]
  ) => void | Promise<void>,
  priority: number = 10
): void {
  hookAfter('createPage', callback, priority);
}
