import {
  commit,
  del,
  PoolClient,
  rollback,
  select,
  startTransaction
} from '@evershop/postgres-query-builder';
import { getConnection } from '../../../../lib/postgres/connection.js';
import {
  hookable,
  hookBefore,
  hookAfter
} from '../../../../lib/util/hookable.js';
import { WidgetData } from './createWidget.js';

async function deleteWidgetData(uuid: string, connection: PoolClient) {
  // Renamed in cms migration 1.3.0: widget → widget_instance.
  // widget_placement rows cascade-delete via FK ON DELETE CASCADE.
  await del('widget_instance').where('uuid', '=', uuid).execute(connection);
}

/**
 * Delete widget service. This service will delete a widget with all related data
 * @param {String} uuid
 * @param {Object} context
 */
async function deleteWidget(uuid: string, context: Record<string, any>) {
  const connection = await getConnection();
  await startTransaction(connection);
  try {
    const query = select().from('widget_instance');
    const widget = await query.where('uuid', '=', uuid).load(connection);
    if (!widget) {
      throw new Error('Invalid widget id');
    }
    await hookable(deleteWidgetData, { ...context, widget, connection })(
      uuid,
      connection
    );
    await commit(connection);
    return widget;
  } catch (e) {
    await rollback(connection);
    throw e;
  }
}

export default async (
  uuid: string,
  context: Record<string, any>
): Promise<WidgetData> => {
  // Make sure the context is either not provided or is an object
  if (context && typeof context !== 'object') {
    throw new Error('Context must be an object');
  }
  const widget = await hookable(deleteWidget, context)(uuid, context);
  return widget;
};

export function hookBeforeDeleteWidgetData(
  callback: (
    this: Record<string, any>,
    ...args: [uuid: string, connection: PoolClient]
  ) => void | Promise<void>,
  priority: number = 10
): void {
  hookBefore('deleteWidgetData', callback, priority);
}

export function hookAfterDeleteWidgetData(
  callback: (
    this: Record<string, any>,
    ...args: [uuid: string, connection: PoolClient]
  ) => void | Promise<void>,
  priority: number = 10
): void {
  hookAfter('deleteWidgetData', callback, priority);
}

export function hookBeforeDeleteWidget(
  callback: (
    this: Record<string, any>,
    ...args: [uuid: string, context: Record<string, any>]
  ) => void | Promise<void>,
  priority: number = 10
): void {
  hookBefore('deleteWidget', callback, priority);
}

export function hookAfterDeleteWidget(
  callback: (
    this: Record<string, any>,
    ...args: [uuid: string, context: Record<string, any>]
  ) => void | Promise<void>,
  priority: number = 10
): void {
  hookAfter('deleteWidget', callback, priority);
}
