import {
  commit,
  del,
  rollback,
  select,
  startTransaction
} from '@evershop/postgres-query-builder';
import { getConnection } from '../../../../lib/postgres/connection.js';
import { hookable } from '../../../../lib/util/hookable.js';

async function deleteWidgetData(uuid, connection) {
  await del('widget').where('uuid', '=', uuid).execute(connection);
}
/**
 * Delete widget service. This service will delete a widget with all related data
 * @param {String} uuid
 * @param {Object} context
 */
async function deleteWidget(uuid, context) {
  const connection = await getConnection();
  await startTransaction(connection);
  try {
    const query = select().from('widget');
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

export default async (uuid, context) => {
  // Make sure the context is either not provided or is an object
  if (context && typeof context !== 'object') {
    throw new Error('Context must be an object');
  }
  const widget = await hookable(deleteWidget, context)(uuid, context);
  return widget;
};
