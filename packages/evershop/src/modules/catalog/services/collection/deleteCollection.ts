import {
  startTransaction,
  commit,
  rollback,
  select,
  del
} from '@evershop/postgres-query-builder';
import type { PoolClient } from '@evershop/postgres-query-builder';
import { getConnection } from '../../../../lib/postgres/connection.js';
import { hookable } from '../../../../lib/util/hookable.js';

async function deleteCollectionData(uuid: string, connection: PoolClient) {
  await del('collection').where('uuid', '=', uuid).execute(connection);
}
/**
 * Delete collection service. This service will delete a collection with all related data
 * @param {String} uuid
 * @param {Object} context
 */
async function deleteCollection(uuid: string, context: Record<string, any>) {
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
export default async (uuid: string, context: Record<string, any>) => {
  // Make sure the context is either not provided or is an object
  if (context && typeof context !== 'object') {
    throw new Error('Context must be an object');
  }
  const collection = await hookable(deleteCollection, context)(uuid, context);
  return collection;
};
