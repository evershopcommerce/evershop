import {
  commit,
  insert,
  rollback,
  startTransaction
} from '@evershop/postgres-query-builder';
import { getConnection } from '../../../../lib/postgres/connection.js';
import { hookable } from '../../../../lib/util/hookable.js';
import {
  getValue,
  getValueSync
} from '../../../../lib/util/registry.js';
import { getAjv } from '../../../base/services/getAjv.js';
import pageDataSchema from './pageDataSchema.json' with { type: 'json' };

function validatePageDataBeforeInsert(data) {
  const ajv = getAjv();
  pageDataSchema.required = [
    'status',
    'name',
    'url_key',
    'content',
    'meta_title'
  ];
  const jsonSchema = getValueSync('createPageDataJsonSchema', pageDataSchema);
  const validate = ajv.compile(jsonSchema);
  const valid = validate(data);
  if (valid) {
    return data;
  } else {
    throw new Error(validate.errors[0].message);
  }
}

async function insertPageData(data, connection) {
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
async function createPage(data, context) {
  const connection = await getConnection();
  await startTransaction(connection);
  try {
    const pageData = await getValue('pageDataBeforeCreate', data);
    // Validate page data
    validatePageDataBeforeInsert(pageData);

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

export default async (data, context) => {
  // Make sure the context is either not provided or is an object
  if (context && typeof context !== 'object') {
    throw new Error('Context must be an object');
  }
  const page = await hookable(createPage, context)(data, context);
  return page;
};
