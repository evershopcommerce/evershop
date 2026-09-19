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
import type { BlogTagRow } from '../../types/index.js';
import blogTagDataSchema from './blogTagDataSchema.json' with { type: 'json' };

function validate(data: any): any {
  const ajv = getAjv();
  (blogTagDataSchema as any).required = ['name'];
  const jsonSchema = getValueSync(
    'createBlogTagDataJsonSchema',
    blogTagDataSchema,
    {}
  );
  const v = ajv.compile(jsonSchema);
  if (v(data)) {
    return data;
  }
  throw new Error(v.errors[0].message);
}

async function insertBlogTagData(data: any, connection: any): Promise<BlogTagRow> {
  return insert('blog_tag').given(data).execute(connection) as Promise<BlogTagRow>;
}

const _createBlogTag = async function createBlogTag(
  data: any,
  context: any
): Promise<BlogTagRow> {
  const connection = await getConnection();
  await startTransaction(connection);
  try {
    const tagData = await getValue('blogTagDataBeforeCreate', data);
    validate(tagData);
    const tag = await hookable(insertBlogTagData, { ...context, connection })(
      tagData,
      connection
    );
    await commit(connection);
    await emit('blog_tag_created', { uuid: tag.uuid, url_key: tag.url_key });
    return tag;
  } catch (e) {
    await rollback(connection);
    throw e;
  }
};

export async function createBlogTag(data: any, context?: any): Promise<BlogTagRow> {
  if (context && typeof context !== 'object') {
    throw new Error('Context must be an object');
  }
  return hookable(_createBlogTag, context)(data, context);
}

export function hookBeforeCreateBlogTag(
  callback: (this: Record<string, any>, data: any, context: any) => void | Promise<void>,
  priority = 10
): void {
  hookBefore('createBlogTag', callback, priority);
}

export function hookAfterCreateBlogTag(
  callback: (this: Record<string, any>, data: any, context: any) => void | Promise<void>,
  priority = 10
): void {
  hookAfter('createBlogTag', callback, priority);
}
