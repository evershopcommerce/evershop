import {
  commit,
  rollback,
  select,
  update,
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
  (blogCategoryDataSchema as any).required = [];
  const jsonSchema = getValueSync(
    'updateBlogCategoryDataJsonSchema',
    blogCategoryDataSchema,
    {}
  );
  const v = ajv.compile(jsonSchema);
  if (v(data)) {
    return data;
  }
  throw new Error(v.errors[0].message);
}

async function updateBlogCategoryData(
  uuid: string,
  data: any,
  connection: any
): Promise<BlogCategory> {
  const query = select().from('blog_category');
  query
    .leftJoin('blog_category_description')
    .on(
      'blog_category_description.blog_category_description_blog_category_id',
      '=',
      'blog_category.blog_category_id'
    );
  const category = await query.where('uuid', '=', uuid).load(connection);
  if (!category) {
    throw new Error('Requested category not found');
  }

  const newCategory = await update('blog_category')
    .given(data)
    .where('uuid', '=', uuid)
    .execute(connection);
  Object.assign(category, newCategory);

  let description = {};
  try {
    description = await update('blog_category_description')
      .given(data)
      .where(
        'blog_category_description_blog_category_id',
        '=',
        category.blog_category_id
      )
      .execute(connection);
  } catch (e) {
    if (!e.message.includes('No data was provided')) {
      throw e;
    }
  }

  return { ...category, ...description } as BlogCategory;
}

const _updateBlogCategory = async function updateBlogCategory(
  uuid: string,
  data: any,
  context: any
): Promise<BlogCategory> {
  const connection = await getConnection();
  await startTransaction(connection);
  try {
    const categoryData = await getValue('blogCategoryDataBeforeUpdate', data);
    validate(categoryData);
    const category = await hookable(updateBlogCategoryData, {
      ...context,
      connection
    })(uuid, categoryData, connection);
    await commit(connection);
    await emit('blog_category_updated', {
      uuid: category.uuid,
      url_key: category.url_key
    });
    return category;
  } catch (e) {
    await rollback(connection);
    throw e;
  }
};

export async function updateBlogCategory(
  uuid: string,
  data: any,
  context?: any
): Promise<BlogCategory> {
  if (context && typeof context !== 'object') {
    throw new Error('Context must be an object');
  }
  return hookable(_updateBlogCategory, context)(uuid, data, context);
}

export function hookBeforeUpdateBlogCategory(
  callback: (this: Record<string, any>, uuid: any, data: any, context: any) => void | Promise<void>,
  priority = 10
): void {
  hookBefore('updateBlogCategory', callback, priority);
}

export function hookAfterUpdateBlogCategory(
  callback: (this: Record<string, any>, uuid: any, data: any, context: any) => void | Promise<void>,
  priority = 10
): void {
  hookAfter('updateBlogCategory', callback, priority);
}
