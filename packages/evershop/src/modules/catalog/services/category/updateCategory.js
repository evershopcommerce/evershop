const { hookable } = require('@evershop/evershop/src/lib/util/hookable');
const {
  getValueSync,
  getValue
} = require('@evershop/evershop/src/lib/util/registry');
const {
  startTransaction,
  commit,
  rollback,
  update,
  select
} = require('@evershop/postgres-query-builder');
const {
  getConnection
} = require('@evershop/evershop/src/lib/postgres/connection');
const { getAjv } = require('../../../base/services/getAjv');
const categoryDataSchema = require('./categoryDataSchema.json');

function validateCategoryDataBeforeInsert(data) {
  const ajv = getAjv();
  categoryDataSchema.required = [];
  const jsonSchema = getValueSync(
    'updateCategoryDataJsonSchema',
    categoryDataSchema
  );
  const validate = ajv.compile(jsonSchema);
  const valid = validate(data);
  if (valid) {
    return data;
  } else {
    throw new Error(validate.errors[0].message);
  }
}

async function updateCategoryData(uuid, data, connection) {
  const query = select().from('category');
  query
    .leftJoin('category_description')
    .on(
      'category_description.category_description_category_id',
      '=',
      'category.category_id'
    );
  const category = await query.where('uuid', '=', uuid).load(connection);
  if (!category) {
    throw new Error('Requested category not found');
  }

  try {
    const newCategory = await update('category')
      .given(data)
      .where('uuid', '=', uuid)
      .execute(connection);
    Object.assign(category, newCategory);
  } catch (e) {
    if (!e.message.includes('No data was provided')) {
      throw e;
    }
  }
  try {
    const description = await update('category_description')
      .given(data)
      .where('category_description_category_id', '=', category.category_id)
      .execute(connection);
    Object.assign(category, description);
  } catch (e) {
    if (!e.message.includes('No data was provided')) {
      throw e;
    }
  }

  return category;
}

/**
 * Update category service. This service will update a category with all related data
 * @param {String} uuid
 * @param {Object} data
 * @param {Object} connection
 */
async function updateCategory(uuid, data, connection) {
  const categoryData = await getValue('categoryDataBeforeUpdate', data);
  // Validate category data
  validateCategoryDataBeforeInsert(categoryData);

  // Insert category data
  const category = await hookable(updateCategoryData, { connection })(
    uuid,
    categoryData,
    connection
  );

  return category;
}

module.exports = async (uuid, data, context) => {
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
    const collection = await hookable(updateCategory, hookContext)(
      uuid,
      data,
      connection
    );
    await commit(connection);
    return collection;
  } catch (e) {
    await rollback(connection);
    throw e;
  }
};
