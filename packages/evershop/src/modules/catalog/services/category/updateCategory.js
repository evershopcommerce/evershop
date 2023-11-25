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
  categoryDataSchema.required = ['status'];
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
  const category = await select()
    .from('category')
    .where('uuid', '=', uuid)
    .load(connection);

  if (!category) {
    throw new Error('Requested category not found');
  }
  const result = await update('category')
    .given(data)
    .where('uuid', '=', uuid)
    .execute(connection);

  let description = {};
  try {
    description = await update('category_description')
      .given(data)
      .where('category_description_category_id', '=', category.category_id)
      .execute(connection);
  } catch (e) {
    if (!e.message.includes('No data was provided')) {
      throw e;
    }
  }

  return {
    ...result,
    ...description
  };
}

/**
 * Update category service. This service will update a category with all related data
 * @param {Object} data
 */
async function updateCategory(uuid, data) {
  const connection = await getConnection();
  await startTransaction(connection);
  try {
    const categoryData = await getValue('categoryDataBeforeUpdate', data);
    // Validate category data
    validateCategoryDataBeforeInsert(categoryData);

    // Insert category data
    const category = await hookable(updateCategoryData, { connection })(
      uuid,
      categoryData,
      connection
    );

    await commit(connection);
    return category;
  } catch (e) {
    await rollback(connection);
    throw e;
  }
}

module.exports = async (uuid, data) => {
  const result = await hookable(updateCategory)(uuid, data);
  return result;
};
