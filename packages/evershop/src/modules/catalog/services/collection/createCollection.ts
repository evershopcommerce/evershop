import {
  startTransaction,
  commit,
  rollback,
  insert
} from '@evershop/postgres-query-builder';
import type { PoolClient } from '@evershop/postgres-query-builder';
import { JSONSchemaType } from 'ajv';
import { getConnection } from '../../../../lib/postgres/connection.js';
import { hookable } from '../../../../lib/util/hookable.js';
import { getValueSync, getValue } from '../../../../lib/util/registry.js';
import { getAjv } from '../../../base/services/getAjv.js';
import collectionDataSchema from './collectionDataSchema.json' with { type: 'json' };

export type CollectionData = {
  name: string;
  description: string;
  code: string;
  [key: string]: any;
};

function validateCollectionDataBeforeInsert(data: CollectionData) {
  const ajv = getAjv();
  (collectionDataSchema as JSONSchemaType<any>).required = ['name', 'description', 'code'];
  const jsonSchema = getValueSync(
    'createCollectionDataJsonSchema',
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

async function insertCollectionData(data: CollectionData, connection: PoolClient) {
  const collection = await insert('collection').given(data).execute(connection);
  return collection;
}

/**
 * Create collection service. This service will create a collection with all related data
 * @param {Object} data
 * @param {Object} context
 */
async function createCollection(data: CollectionData, context: Record<string, any>) {
  const connection = await getConnection();
  await startTransaction(connection);
  const hookContext = { connection, ...context };
  try {
    const collectionData = await getValue('collectionDataBeforeCreate', data);
    // Validate collection data
    validateCollectionDataBeforeInsert(collectionData);

    // Insert collection data
    const collection = await hookable(insertCollectionData, hookContext)(
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
 * Create collection service. This service will create a collection with all related data
 * @param {Object} data
 * @param {Object} context
 */
export default async (data: CollectionData, context: Record<string, any>) => {
  // Make sure the context is either not provided or is an object
  if (context && typeof context !== 'object') {
    throw new Error('Context must be an object');
  }
  const collection = await hookable(createCollection)(data, context);
  return collection;
};
