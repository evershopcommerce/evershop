import {
  commit,
  insert,
  rollback,
  startTransaction
} from '@evershop/postgres-query-builder';
import { emit } from '../../../../lib/event/emitter.js';
import { getConnection } from '../../../../lib/postgres/connection.js';
import {
  hookable,
  hookBefore,
  hookAfter
} from '../../../../lib/util/hookable.js';
import { getValue, getValueSync } from '../../../../lib/util/registry.js';
import { getAjv } from '../../../base/services/getAjv.js';
import type { BlogCategoryRow, BlogCategoryDescriptionRow } from '../../types/index.js';
import blogCategoryDataSchema from './blogCategoryDataSchema.json' with { type: 'json' };

type BlogCategory = BlogCategoryRow & BlogCategoryDescriptionRow;

function validate(data: any): any {
  const ajv = getAjv();
  (blogCategoryDataSchema as any).required = ['name'];
  const jsonSchema = getValueSync(
    'createBlogCategoryDataJsonSchema',
    blogCategoryDataSchema,
    {}
  );
  const v = ajv.compile(jsonSchema);
  if (v(data)) {
    return data;
  }
  throw new Error(v.errors[0].message);
}

async function insertBlogCategoryData(
  data: any,
  connection: any
): Promise<BlogCategory> {
  const category = await insert('blog_category').given(data).execute(connection);
  const description = await insert('blog_category_description')
    .given(data)
    .prime('blog_category_description_blog_category_id', category.insertId)
    .execute(connection);
  return { ...description, ...category } as BlogCategory;
}

const _createBlogCategory = async function createBlogCategory(
  data: any,
  context: any
): Promise<BlogCategory> {
  const connection = await getConnection();
  await startTransaction(connection);
  try {
    const categoryData = await getValue('blogCategoryDataBeforeCreate', data);
    validate(categoryData);
    const category = await hookable(insertBlogCategoryData, {
      ...context,
      connection
    })(categoryData, connection);
    await commit(connection);
    await emit('blog_category_created', {
      uuid: category.uuid,
      url_key: category.url_key
    });
    return category;
  } catch (e) {
    await rollback(connection);
    throw e;
  }
};

export async function createBlogCategory(
  data: any,
  context?: any
): Promise<BlogCategory> {
  if (context && typeof context !== 'object') {
    throw new Error('Context must be an object');
  }
  return hookable(_createBlogCategory, context)(data, context);
}

export function hookBeforeCreateBlogCategory(
  callback: (this: Record<string, any>, data: any, context: any) => void | Promise<void>,
  priority = 10
): void {
  hookBefore('createBlogCategory', callback, priority);
}

export function hookAfterCreateBlogCategory(
  callback: (this: Record<string, any>, data: any, context: any) => void | Promise<void>,
  priority = 10
): void {
  hookAfter('createBlogCategory', callback, priority);
}
