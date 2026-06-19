import {
  commit,
  rollback,
  select,
  startTransaction,
  update
} from '@evershop/postgres-query-builder';
import type { PoolClient } from '@evershop/postgres-query-builder';
import { getConnection } from '../../../../lib/postgres/connection.js';
import { hookable, hookBefore, hookAfter } from '../../../../lib/util/hookable.js';
import {
  getValue,
  getValueSync
} from '../../../../lib/util/registry.js';
import { sanitizeRawHtml } from '../../../../lib/util/sanitizeHtml.js';
import type { CategoryDescriptionRow, CategoryRow } from '../../../../types/db/index.js';
import { getAjv } from '../../../base/services/getAjv.js';
import categoryDataSchema from './categoryDataSchema.json' with { type: 'json' };
import { CategoryData } from './createCategory.js';


function validateCategoryDataBeforeInsert(data: CategoryData): CategoryData {
  const ajv = getAjv();
  categoryDataSchema.required = [];
  const jsonSchema = getValueSync(
    'updateCategoryDataJsonSchema',
    categoryDataSchema,
    {}
  );
  const validate = ajv.compile(jsonSchema);
  const valid = validate(data);
  if (valid) {
    return data;
  } else {
    throw new Error(validate.errors[0].message);
  }
}

async function updateCategoryData(uuid: string, data: CategoryData, connection: PoolClient): Promise<CategoryRow & CategoryDescriptionRow & { updatedId?: number }> {
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
  let newCategory;
  try {
    newCategory = await update('category')
      .given(data)
      .where('uuid', '=', uuid)
      .execute(connection);
    Object.assign(category, newCategory);
  } catch (e) {
    if (!e.message.includes('No data was provided')) {
      throw e;
    }
  }
  let description;
  try {
     description = await update('category_description')
      .given(data)
      .where('category_description_category_id', '=', category.category_id)
      .execute(connection);
    Object.assign(category, description);
  } catch (e) {
    if (!e.message.includes('No data was provided')) {
      throw e;
    }
  }

  return {
    ...description,
    ...newCategory,
    updatedId: category.category_id
  };
}

/**
 * Update category service. This service will update a category with all related data
 * @param {String} uuid
 * @param {Object} data
 * @param {Object} context
 */
async function updateCategory(uuid: string, data: CategoryData, context: Record<string, any>): Promise<CategoryRow & CategoryDescriptionRow & { updatedId?: number }> {
  const connection = await getConnection();
  await startTransaction(connection);
  try {
    const categoryData = await getValue('categoryDataBeforeUpdate', data);
    // Validate category data
    validateCategoryDataBeforeInsert(categoryData);

    if (categoryData.description) {
      sanitizeRawHtml(categoryData.description);
    }
    // Insert category data
    const category = await hookable(updateCategoryData, {
      ...context,
      connection
    })(uuid, categoryData, connection);

    await commit(connection);
    return category;
  } catch (e) {
    await rollback(connection);
    throw e;
  }
}

/**
 * Update category service. This service will update a category with all related data
 * @param {String} uuid
 * @param {Object} data
 * @param {Object} context
 */
export default async (uuid: string, data: CategoryData, context: Record<string, any>): Promise<CategoryRow & CategoryDescriptionRow & { updatedId?: number }> => {
  // Make sure the context is either not provided or is an object
  if (context && typeof context !== 'object') {
    throw new Error('Context must be an object');
  }
  const category = await hookable(updateCategory, context)(uuid, data, context);
  return category;
};

export function hookBeforeUpdateCategoryData(
  callback: (
    this: Record<string, any>,
    ...args: [
    uuid: string,
    data: CategoryData,
    connection: PoolClient
    ]
  ) => void | Promise<void>,
  priority: number = 10
): void {
  hookBefore('updateCategoryData', callback, priority);
}

export function hookAfterUpdateCategoryData(
  callback: (
    this: Record<string, any>,
    ...args: [
    uuid: string,
    data: CategoryData,
    connection: PoolClient
    ]
  ) => void | Promise<void>,
  priority: number = 10
): void {
  hookAfter('updateCategoryData', callback, priority);
}

export function hookBeforeUpdateCategory(
  callback: (
    this: Record<string, any>,
    ...args: [
    uuid: string,
    data: CategoryData,
    context: Record<string, any>
    ]
  ) => void | Promise<void>,
  priority: number = 10
): void {
  hookBefore('updateCategory', callback, priority);
}

export function hookAfterUpdateCategory(
  callback: (
    this: Record<string, any>,
    ...args: [
    uuid: string,
    data: CategoryData,
    context: Record<string, any>
    ]
  ) => void | Promise<void>,
  priority: number = 10
): void {
  hookAfter('updateCategory', callback, priority);
}
