const { hookable } = require('@evershop/evershop/src/lib/util/hookable');
const {
  getValueSync,
  getValue
} = require('@evershop/evershop/src/lib/util/registry');
const {
  startTransaction,
  commit,
  rollback,
  update,
  select
} = require('@evershop/postgres-query-builder');
const {
  getConnection
} = require('@evershop/evershop/src/lib/postgres/connection');
const { getAjv } = require('../../../base/services/getAjv');
const widgetDataSchema = require('./widgetDataSchema.json');

function validateWidgetDataBeforeInsert(data) {
  const ajv = getAjv();
  widgetDataSchema.required = ['status'];
  const jsonSchema = getValueSync(
    'updateWidgetDataJsonSchema',
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

async function updateWidgetData(uuid, data, connection) {
  const query = select().from('widget');
  const widget = await query.where('uuid', '=', uuid).load(connection);

  if (!widget) {
    throw new Error('Requested widget not found');
  }
  const newWidget = await update('widget')
    .given(data)
    .where('uuid', '=', uuid)
    .execute(connection);

  return newWidget;
}

/**
 * Update widget service. This service will update a widget with all related data
 * @param {String} uuid
 * @param {Object} data
 * @param {Object} context
 */
async function updateWidget(uuid, data, context) {
  const connection = await getConnection();
  await startTransaction(connection);
  try {
    const widgetData = await getValue('widgetDataBeforeUpdate', data);
    // Validate widget data
    validateWidgetDataBeforeInsert(widgetData);

    // Insert widget data
    const widget = await hookable(updateWidgetData, { ...context, connection })(
      uuid,
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

module.exports = async (uuid, data, context) => {
  // Make sure the context is either not provided or is an object
  if (context && typeof context !== 'object') {
    throw new Error('Context must be an object');
  }
  const widget = await hookable(updateWidget, context)(uuid, data, context);
  return widget;
};
