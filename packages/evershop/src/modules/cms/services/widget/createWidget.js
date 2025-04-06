import { hookable } from '@evershop/evershop/src/lib/util/hookable.js';
import {
  getValueSync,
  getValue
} from '@evershop/evershop/src/lib/util/registry.js';
import {
  startTransaction,
  commit,
  rollback,
  insert
} from '@evershop/postgres-query-builder';
import { getConnection } from '@evershop/evershop/src/lib/postgres/connection.js';
import { getAjv } from '../../../base/services/getAjv.js';
import widgetDataSchema from './widgetDataSchema.json' with { type: 'json' };

function validateWidgetDataBeforeInsert(data) {
  const ajv = getAjv();
  widgetDataSchema.required = ['status', 'name', 'sort_order'];
  const jsonSchema = getValueSync(
    'createWidgetDataJsonSchema',
    widgetDataSchema
  );
  const validate = ajv.compile(jsonSchema);
  const valid = validate(data);
  if (valid) {
    return data;
  } else {
    throw new Error(validate.errors[0].message);
  }
}

async function insertWidgetData(data, connection) {
  const widget = await insert('widget').given(data).execute(connection);
  return widget;
}

/**
 * Create widget service. This service will create a widget with all related data
 * @param {Object} data
 * @param {Object} context
 */
async function createWidget(data, context) {
  const connection = await getConnection();
  await startTransaction(connection);
  try {
    const widgetData = await getValue('widgetDataBeforeCreate', data);
    // Validate widget data
    validateWidgetDataBeforeInsert(widgetData);

    // Insert widget data
    const widget = await hookable(insertWidgetData, { ...context, connection })(
      widgetData,
      connection
    );

    await commit(connection);
    return widget;
  } catch (e) {
    await rollback(connection);
    throw e;
  }
}

export default async (data, context) => {
  // Make sure the context is either not provided or is an object
  if (context && typeof context !== 'object') {
    throw new Error('Context must be an object');
  }
  const widget = await hookable(createWidget, context)(data, context);
  return widget;
};
