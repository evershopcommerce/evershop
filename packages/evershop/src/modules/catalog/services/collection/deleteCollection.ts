import {
  startTransaction,
  commit,
  rollback,
  select,
  del
} from '@evershop/postgres-query-builder';
import type { PoolClient } from '@evershop/postgres-query-builder';
import { getConnection } from '../../../../lib/postgres/connection.js';
import {
  hookable,
  hookBefore,
  hookAfter
} from '../../../../lib/util/hookable.js';
import type { CollectionRow } from '../../../../types/db/index.js';

async function deleteCollectionData(
  uuid: string,
  connection: PoolClient
): Promise<void> {
  await del('collection').where('uuid', '=', uuid).execute(connection);
}
/**
 * Delete collection service. This service will delete a collection with all related data
 * @param {String} uuid
 * @param {Object} context
 */
async function deleteCollection(
  uuid: string,
  context: Record<string, any>
): Promise<CollectionRow> {
  const connection = await getConnection();
  await startTransaction(connection);
  try {
    const query = select().from('collection');
    const collection = await query.where('uuid', '=', uuid).load(connection);

    if (!collection) {
      throw new Error('Invalid collection id');
    }
    await hookable(deleteCollectionData, {
      ...context,
      connection,
      collection
    })(uuid, connection);
    await commit(connection);
    return collection;
  } catch (e) {
    await rollback(connection);
    throw e;
  }
}

/**
 * Delete collection service. This service will delete a collection with all related data
 * @param {String} uuid
 * @param {Object} context
 */
export default async (
  uuid: string,
  context: Record<string, any>
): Promise<CollectionRow> => {
  // Make sure the context is either not provided or is an object
  if (context && typeof context !== 'object') {
    throw new Error('Context must be an object');
  }
  const collection = await hookable(deleteCollection, context)(uuid, context);
  return collection;
};

export function hookBeforeDeleteCollectionData(
  callback: (
    this: Record<string, any>,
    ...args: [uuid: string, connection: PoolClient]
  ) => void | Promise<void>,
  priority: number = 10
): void {
  hookBefore('deleteCollectionData', callback, priority);
}

export function hookAfterDeleteCollectionData(
  callback: (
    this: Record<string, any>,
    ...args: [uuid: string, connection: PoolClient]
  ) => void | Promise<void>,
  priority: number = 10
): void {
  hookAfter('deleteCollectionData', callback, priority);
}

export function hookBeforeDeleteCollection(
  callback: (
    this: Record<string, any>,
    ...args: [uuid: string, context: Record<string, any>]
  ) => void | Promise<void>,
  priority: number = 10
): void {
  hookBefore('deleteCollection', callback, priority);
}

export function hookAfterDeleteCollection(
  callback: (
    this: Record<string, any>,
    ...args: [uuid: string, context: Record<string, any>]
  ) => void | Promise<void>,
  priority: number = 10
): void {
  hookAfter('deleteCollection', callback, priority);
}
