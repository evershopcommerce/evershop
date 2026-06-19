import {
  startTransaction,
  commit,
  rollback,
  insert
} from '@evershop/postgres-query-builder';
import type { PoolClient } from '@evershop/postgres-query-builder';
import { getConnection } from '../../../../lib/postgres/connection.js';
import {
  hookable,
  hookBefore,
  hookAfter
} from '../../../../lib/util/hookable.js';
import { getValue } from '../../../../lib/util/registry.js';
import { Row, sanitizeRawHtml } from '../../../../lib/util/sanitizeHtml.js';
import type { CollectionRow } from '../../../../types/db/index.js';

export type CollectionData = {
  name: string;
  code: string;
  description?: Row[];
  [key: string]: unknown;
};

async function insertCollectionData(
  data: CollectionData,
  connection: PoolClient
): Promise<CollectionRow & { insertId: number }> {
  const collection = await insert('collection').given(data).execute(connection);
  return collection;
}

/**
 * Create collection service. This service will create a collection with all related data
 * @param {Object} data
 * @param {Object} context
 */
async function createCollection(
  data: CollectionData,
  context: Record<string, any>
): Promise<CollectionRow & { insertId: number }> {
  const connection = await getConnection();
  await startTransaction(connection);
  const hookContext = { connection, ...context };
  try {
    const collectionData = await getValue<CollectionData>(
      'collectionDataBeforeCreate',
      data,
      {}
    );
    // Sanitize raw HTML blocks in EditorJS content
    if (collectionData.description) {
      sanitizeRawHtml(collectionData.description);
    }

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
export default async (
  data: CollectionData,
  context: Record<string, any>
): Promise<CollectionRow & { insertId: number }> => {
  // Make sure the context is either not provided or is an object
  if (context && typeof context !== 'object') {
    throw new Error('Context must be an object');
  }
  const collection = await hookable(createCollection)(data, context);
  return collection;
};

export function hookBeforeInsertCollectionData(
  callback: (
    this: Record<string, any>,
    ...args: [data: CollectionData, connection: PoolClient]
  ) => void | Promise<void>,
  priority: number = 10
): void {
  hookBefore('insertCollectionData', callback, priority);
}

export function hookAfterInsertCollectionData(
  callback: (
    this: Record<string, any>,
    ...args: [data: CollectionData, connection: PoolClient]
  ) => void | Promise<void>,
  priority: number = 10
): void {
  hookAfter('insertCollectionData', callback, priority);
}

export function hookBeforeCreateCollection(
  callback: (
    this: Record<string, any>,
    ...args: [data: CollectionData, context: Record<string, any>]
  ) => void | Promise<void>,
  priority: number = 10
): void {
  hookBefore('createCollection', callback, priority);
}

export function hookAfterCreateCollection(
  callback: (
    this: Record<string, any>,
    ...args: [data: CollectionData, context: Record<string, any>]
  ) => void | Promise<void>,
  priority: number = 10
): void {
  hookAfter('createCollection', callback, priority);
}
