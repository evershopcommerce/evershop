import { Row } from '@components/common/form/Editor.js';
import {
  commit,
  insert,
  rollback,
  select,
  startTransaction
} from '@evershop/postgres-query-builder';
import type { PoolClient } from '@evershop/postgres-query-builder';
import { JSONSchemaType } from 'ajv';
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

export type CategoryData = {
  name: string;
  url_key: string;
  description?: Row[];
  [key: string]: unknown;
};

function validateCategoryDataBeforeInsert(data: CategoryData): CategoryData {
  const ajv = getAjv();
  (categoryDataSchema as JSONSchemaType<any>).required = ['name', 'url_key'];
  const jsonSchema = getValueSync(
    'createCategoryDataJsonSchema',
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

async function insertCategoryData(data: CategoryData & { parent_id?: number }, connection: PoolClient): Promise<CategoryRow & CategoryDescriptionRow & { insertId: number }> {
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
async function createCategory(data: CategoryData, context: Record<string, any>): Promise<CategoryRow & CategoryDescriptionRow & { insertId: number }> {
  const connection = await getConnection();
  await startTransaction(connection);
  try {
    const categoryData = await getValue('categoryDataBeforeCreate', data);
    // Validate category data
    validateCategoryDataBeforeInsert(categoryData);

    // Sanitize raw HTML blocks in EditorJS content
    if (categoryData.description) {
      sanitizeRawHtml(categoryData.description);
    }
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

/**
 * Create category service. This service will create a category with all related data
 * @param {Object} data
 * @param {Object} context
 */
export default async (data: CategoryData, context: Record<string, any>): Promise<CategoryRow & CategoryDescriptionRow & { insertId: number }> => {
  // Make sure the context is either not provided or is an object
  if (context && typeof context !== 'object') {
    throw new Error('Context must be an object');
  }
  const category = await hookable(createCategory, context)(data, context);
  return category;
};

export function hookBeforeInsertCategoryData(
  callback: (
    this: Record<string, any>,
    ...args: [
    data: CategoryData & { parent_id?: number },
    connection: PoolClient
    ]
  ) => void | Promise<void>,
  priority: number = 10
): void {
  hookBefore('insertCategoryData', callback, priority);
}

export function hookAfterInsertCategoryData(
  callback: (
    this: Record<string, any>,
    ...args: [
    data: CategoryData & { parent_id?: number },
    connection: PoolClient
    ]
  ) => void | Promise<void>,
  priority: number = 10
): void {
  hookAfter('insertCategoryData', callback, priority);
}

export function hookBeforeCreateCategory(
  callback: (
    this: Record<string, any>,
    ...args: [
    data: CategoryData,
    context: Record<string, any>
    ]
  ) => void | Promise<void>,
  priority: number = 10
): void {
  hookBefore('createCategory', callback, priority);
}

export function hookAfterCreateCategory(
  callback: (
    this: Record<string, any>,
    ...args: [
    data: CategoryData,
    context: Record<string, any>
    ]
  ) => void | Promise<void>,
  priority: number = 10
): void {
  hookAfter('createCategory', callback, priority);
}
