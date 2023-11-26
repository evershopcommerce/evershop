const { hookable } = require('@evershop/evershop/src/lib/util/hookable');
const {
  getValueSync,
  getValue
} = require('@evershop/evershop/src/lib/util/registry');
const {
  startTransaction,
  commit,
  rollback,
  insert
} = require('@evershop/postgres-query-builder');
const {
  getConnection
} = require('@evershop/evershop/src/lib/postgres/connection');
const { getAjv } = require('../../../base/services/getAjv');
const pageDataSchema = require('./pageDataSchema.json');

function validatePageDataBeforeInsert(data) {
  const ajv = getAjv();
  pageDataSchema.required = [
    'status',
    'name',
    'url_key',
    'content',
    'meta_title',
    'layout'
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
 * @param {Object} connection
 */
async function createPage(data, connection) {
  const pageData = await getValue('pageDataBeforeCreate', data);
  // Validate page data
  validatePageDataBeforeInsert(pageData);

  // Insert page data
  const page = await hookable(insertPageData, { connection })(
    pageData,
    connection
  );

  return page;
}

module.exports = async (data, context) => {
  const connection = await getConnection();
  await startTransaction(connection);
  try {
    const hookContext = {
      connection
    };
    // Make sure the context is either not provided or is an object
    if (context && typeof context !== 'object') {
      throw new Error('Context must be an object');
    }
    // Merge hook context with context
    Object.assign(hookContext, context);
    const result = await hookable(createPage, hookContext)(data, connection);
    await commit(connection);
    return result;
  } catch (e) {
    await rollback(connection);
    throw e;
  }
};
