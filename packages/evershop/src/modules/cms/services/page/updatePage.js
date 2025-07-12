import {
  commit,
  rollback,
  select,
  startTransaction,
  update
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
  pageDataSchema.required = ['status'];
  const jsonSchema = getValueSync('updatePageDataJsonSchema', pageDataSchema);
  const validate = ajv.compile(jsonSchema);
  const valid = validate(data);
  if (valid) {
    return data;
  } else {
    throw new Error(validate.errors[0].message);
  }
}

async function updatePageData(uuid, data, connection) {
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
    throw new Error('Requested page not found');
  }
  const newPage = await update('cms_page')
    .given(data)
    .where('uuid', '=', uuid)
    .execute(connection);

  Object.assign(page, newPage);
  let description = {};
  try {
    description = await update('cms_page_description')
      .given(data)
      .where('cms_page_description_cms_page_id', '=', page.cms_page_id)
      .execute(connection);
  } catch (e) {
    if (!e.message.includes('No data was provided')) {
      throw e;
    }
  }

  return {
    ...page,
    ...description
  };
}

/**
 * Update page service. This service will update a page with all related data
 * @param {String} uuid
 * @param {Object} data
 * @param {Object} context
 */
async function updatePage(uuid, data, context) {
  const connection = await getConnection();
  await startTransaction(connection);
  try {
    const pageData = await getValue('pageDataBeforeUpdate', data);
    // Validate page data
    validatePageDataBeforeInsert(pageData);

    // Insert page data
    const page = await hookable(updatePageData, { ...context, connection })(
      uuid,
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

export default async (uuid, data, context) => {
  // Make sure the context is either not provided or is an object
  if (context && typeof context !== 'object') {
    throw new Error('Context must be an object');
  }
  const page = await hookable(updatePage, context)(uuid, data, context);
  return page;
};
