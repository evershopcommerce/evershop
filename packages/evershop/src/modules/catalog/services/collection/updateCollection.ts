import {  
  commit,
  rollback,
  select,
  startTransaction,
  update
} from '@evershop/postgres-query-builder';
import type { PoolClient } from '@evershop/postgres-query-builder';
import { JSONSchemaType } from 'ajv';
import { getConnection } from '../../../../lib/postgres/connection.js';
import { hookable } from '../../../../lib/util/hookable.js';
import {
  getValue,
  getValueSync
} from '../../../../lib/util/registry.js';
import { getAjv } from '../../../base/services/getAjv.js';
import collectionDataSchema from './collectionDataSchema.json' with { type: 'json' };
import { CollectionData } from './createCollection.js';

function validateCollectionDataBeforeInsert(data: CollectionData) {
  const ajv = getAjv();
  (collectionDataSchema as JSONSchemaType<any>).required = [];
  const jsonSchema = getValueSync(
    'updateCollectionDataJsonSchema',
    collectionDataSchema,
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

async function updateCollectionData(uuid: string, data: CollectionData, connection: PoolClient) {
  const collection = await select()
    .from('collection')
    .where('uuid', '=', uuid)
    .load(connection);

  if (!collection) {
    throw new Error('Requested collection not found');
  }

  try {
    const newCollection = await update('collection')
      .given(data)
      .where('uuid', '=', uuid)
      .execute(connection);

    return newCollection;
  } catch (e) {
    if (!e.message.includes('No data was provided')) {
      throw e;
    } else {
      return collection;
    }
  }
}

/**
 * Update collection service. This service will update a collection with all related data
 * @param {String} uuid
 * @param {Object} data
 * @param {Object} context
 */
async function updateCollection(uuid: string, data: CollectionData, context: Record<string, any>) {
  const connection = await getConnection();
  await startTransaction(connection);
  const hookContext = { connection, ...context };
  try {
    const collectionData = await getValue('collectionDataBeforeUpdate', data);
    // Validate collection data
    validateCollectionDataBeforeInsert(collectionData);

    // Insert collection data
    const collection = await hookable(updateCollectionData, hookContext)(
      uuid,
      collectionData,
      connection
    );
    await commit(connection);
    return collection;
  } catch (e) {
    await rollback(connection);
    throw e;
  }
}

/**
 * Update collection service. This service will update a collection with all related data
 * @param {String} uuid
 * @param {Object} data
 * @param {Object} context
 */
export default async (uuid: string, data: CollectionData, context: Record<string, any>) => {
  // Make sure the context is either not provided or is an object
  if (context && typeof context !== 'object') {
    throw new Error('Context must be an object');
  }
  // Merge hook context with context
  const collection = await hookable(updateCollection, context)(
    uuid,
    data,
    context
  );
  return collection;
};
