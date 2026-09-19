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
import type { BlogTagRow } from '../../types/index.js';
import blogTagDataSchema from './blogTagDataSchema.json' with { type: 'json' };

function validate(data: any): any {
  const ajv = getAjv();
  (blogTagDataSchema as any).required = [];
  const jsonSchema = getValueSync(
    'updateBlogTagDataJsonSchema',
    blogTagDataSchema,
    {}
  );
  const v = ajv.compile(jsonSchema);
  if (v(data)) {
    return data;
  }
  throw new Error(v.errors[0].message);
}

async function updateBlogTagData(
  uuid: string,
  data: any,
  connection: any
): Promise<BlogTagRow> {
  const tag = await select()
    .from('blog_tag')
    .where('uuid', '=', uuid)
    .load(connection);
  if (!tag) {
    throw new Error('Requested tag not found');
  }
  const updated = await update('blog_tag')
    .given(data)
    .where('uuid', '=', uuid)
    .execute(connection);
  return { ...tag, ...updated } as BlogTagRow;
}

const _updateBlogTag = async function updateBlogTag(
  uuid: string,
  data: any,
  context: any
): Promise<BlogTagRow> {
  const connection = await getConnection();
  await startTransaction(connection);
  try {
    const tagData = await getValue('blogTagDataBeforeUpdate', data);
    validate(tagData);
    const tag = await hookable(updateBlogTagData, { ...context, connection })(
      uuid,
      tagData,
      connection
    );
    await commit(connection);
    await emit('blog_tag_updated', { uuid: tag.uuid, url_key: tag.url_key });
    return tag;
  } catch (e) {
    await rollback(connection);
    throw e;
  }
};

export async function updateBlogTag(
  uuid: string,
  data: any,
  context?: any
): Promise<BlogTagRow> {
  if (context && typeof context !== 'object') {
    throw new Error('Context must be an object');
  }
  return hookable(_updateBlogTag, context)(uuid, data, context);
}

export function hookBeforeUpdateBlogTag(
  callback: (this: Record<string, any>, uuid: any, data: any, context: any) => void | Promise<void>,
  priority = 10
): void {
  hookBefore('updateBlogTag', callback, priority);
}

export function hookAfterUpdateBlogTag(
  callback: (this: Record<string, any>, uuid: any, data: any, context: any) => void | Promise<void>,
  priority = 10
): void {
  hookAfter('updateBlogTag', callback, priority);
}
