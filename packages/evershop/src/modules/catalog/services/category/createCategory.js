import {
  commit,
  insert,
  rollback,
  select,
  startTransaction
} from '@evershop/postgres-query-builder';
import { getConnection } from '../../../../lib/postgres/connection.js';
import { hookable } from '../../../../lib/util/hookable.js';
import {
  getValue,
  getValueSync
} from '../../../../lib/util/registry.js';
import { getAjv } from '../../../base/services/getAjv.js';
import categoryDataSchema from './categoryDataSchema.json' with { type: 'json' };

function validateCategoryDataBeforeInsert(data) {
  const ajv = getAjv();
  categoryDataSchema.required = ['name', 'url_key'];
  const jsonSchema = getValueSync(
    'createCategoryDataJsonSchema',
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

async function insertCategoryData(data, connection) {
  const parentId = data.parent_id;
  if (parentId) {
    // Load the parent category
    const parentCategory = await select()
      .from('category')
      .where('category_id', '=', parentId)
      .load(connection);

    if (!parentCategory) {
      throw new Error('Parent category not found');
    }
  }

  const category = await insert('category').given(data).execute(connection);
  const description = await insert('category_description')
    .given(data)
    .prime('category_description_category_id', category.insertId)
    .execute(connection);

  return {
    ...description,
    ...category
  };
}

/**
 * Create category service. This service will create a category with all related data
 * @param {Object} data
 * @param {Object} context
 */
async function createCategory(data, context) {
  const connection = await getConnection();
  await startTransaction(connection);
  try {
    const categoryData = await getValue('categoryDataBeforeCreate', data);
    // Validate category data
    validateCategoryDataBeforeInsert(categoryData);

    // Insert category data
    const category = await hookable(insertCategoryData, context)(
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

export default async (data, context) => {
  // Make sure the context is either not provided or is an object
  if (context && typeof context !== 'object') {
    throw new Error('Context must be an object');
  }
  const category = await hookable(createCategory, context)(data, context);
  return category;
};
