import {
  commit,
  del,
  insert,
  PoolClient,
  rollback,
  select,
  startTransaction,
  update
} from '@evershop/postgres-query-builder';
import { getConnection } from '../../../../lib/postgres/connection.js';
import {
  hookable,
  hookBefore,
  hookAfter
} from '../../../../lib/util/hookable.js';
import { getValue, getValueSync } from '../../../../lib/util/registry.js';
import { getWidgetSchemaValidator } from '../../../../lib/widget/widgetManager.js';
import { getAjv } from '../../../base/services/getAjv.js';
import { WidgetData } from './createWidget.js';
import widgetDataSchema from './widgetDataSchema.json' with { type: 'json' };

function validateWidgetDataBeforeInsert(
  data: Partial<WidgetData>
): Partial<WidgetData> {
  const ajv = getAjv();
  (widgetDataSchema as any).required = ['status'];
  const jsonSchema = getValueSync(
    'updateWidgetDataJsonSchema',
    widgetDataSchema,
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

/**
 * Update the widget_instance row by uuid. Unknown columns in `data` (route,
 * area, sort_order) are silently ignored — they're handled by
 * `updateWidgetPlacements()`.
 */
async function updateWidgetData(
  uuid: string,
  data: Partial<WidgetData>,
  connection: PoolClient
) {
  const query = select().from('widget_instance');
  const widget = await query.where('uuid', '=', uuid).load(connection);

  if (!widget) {
    throw new Error('Requested widget not found');
  }
  // `update().execute()` is typed as `any[]` by postgres-query-builder, but
  // the implementation returns the single updated row when the WHERE is a
  // unique-column equality. Narrow at this boundary so downstream callers
  // (updateWidgetPlacements, etc.) get the actual shape they use.
  const newWidget = (await update('widget_instance')
    .given(data)
    .where('uuid', '=', uuid)
    .execute(connection)) as unknown as {
    widget_instance_id: number;
  } & Record<string, unknown>;

  return newWidget;
}

/**
 * Recreate widget_placement rows when route, area, or sort_order is included
 * in the update payload. Delete existing placements first, then recreate from
 * the cross-product of the new route × area arrays. If neither route nor area
 * is in the update data, leaves existing placements untouched.
 */
async function updateWidgetPlacements(
  widget: { widget_instance_id: number },
  data: Partial<WidgetData>,
  connection: PoolClient
) {
  // Preferred shape: an explicit placements list. Replace the widget's
  // route-level placements (entity_urn IS NULL) and recreate from the list;
  // entity-scoped placements (owned by the page builder) are left untouched.
  // New rows inherit the instance theme so the storefront's denormalized
  // theme filter keeps matching (spec 04 § 4.2).
  if (Array.isArray(data.placements)) {
    const theme = (widget as { theme?: string | null }).theme ?? null;
    await connection.query(
      'DELETE FROM widget_placement WHERE widget_instance_id = $1 AND entity_urn IS NULL',
      [widget.widget_instance_id]
    );
    for (const p of data.placements) {
      const route = typeof p?.route === 'string' ? p.route : '';
      const area = typeof p?.area === 'string' ? p.area : '';
      if (!route || !area) continue;
      await insert('widget_placement')
        .given({
          widget_instance_id: widget.widget_instance_id,
          route,
          area,
          sort_order: Number(p?.sort_order) || 0,
          theme
        })
        .execute(connection);
    }
    return;
  }

  const touchesPlacement =
    data.route !== undefined ||
    data.area !== undefined ||
    data.sort_order !== undefined;
  if (!touchesPlacement) return;

  // Legacy shape: cross-product replace-all.
  await del('widget_placement')
    .where('widget_instance_id', '=', widget.widget_instance_id)
    .execute(connection);

  const routes: string[] = Array.isArray(data.route) ? data.route : [];
  const areas: string[] = Array.isArray(data.area) ? data.area : [];
  const sortOrder = (data.sort_order as number) ?? 1;

  for (const route of routes) {
    for (const area of areas) {
      await insert('widget_placement')
        .given({
          widget_instance_id: widget.widget_instance_id,
          route,
          area,
          sort_order: sortOrder
        })
        .execute(connection);
    }
  }
}

/**
 * Update widget service. This service will update a widget with all related data
 * @param {String} uuid
 * @param {Object} data
 * @param {Object} context
 */
async function updateWidget(
  uuid: string,
  data: Partial<WidgetData>,
  context: Record<string, any>
) {
  const connection = await getConnection();
  await startTransaction(connection);
  try {
    const widgetData = await getValue('widgetDataBeforeUpdate', data);
    // Validate widget data envelope (status, etc.).
    validateWidgetDataBeforeInsert(widgetData);

    // Phase 2b — validate settings against the widget's registered JSON Schema
    // when settings is being updated. Look up the widget's type from the
    // existing row to know which schema to use.
    if (widgetData.settings !== undefined) {
      const existing = await select()
        .from('widget_instance')
        .where('uuid', '=', uuid)
        .load(connection);
      if (existing) {
        const validator = getWidgetSchemaValidator(existing.type as string);
        if (validator) {
          const ok = validator(widgetData.settings);
          if (!ok) {
            throw new Error(
              `Widget settings failed schema validation: ${JSON.stringify(
                validator.errors
              )}`
            );
          }
        }
      }
    }

    // Update widget_instance row
    const widget = await hookable(updateWidgetData, { ...context, connection })(
      uuid,
      widgetData,
      connection
    );

    // Recreate placements if route/area/sort_order changed
    await hookable(updateWidgetPlacements, {
      ...context,
      widget,
      connection
    })(widget, widgetData, connection);

    await commit(connection);
    return widget;
  } catch (e) {
    await rollback(connection);
    throw e;
  }
}

export default async (
  uuid: string,
  data: Partial<WidgetData>,
  context: Record<string, any>
) => {
  // Make sure the context is either not provided or is an object
  if (context && typeof context !== 'object') {
    throw new Error('Context must be an object');
  }
  const widget = await hookable(updateWidget, context)(uuid, data, context);
  return widget;
};

export function hookBeforeUpdateWidgetData(
  callback: (
    this: Record<string, any>,
    ...args: [uuid: string, data: Partial<WidgetData>, connection: PoolClient]
  ) => void | Promise<void>,
  priority: number = 10
): void {
  hookBefore('updateWidgetData', callback, priority);
}

export function hookAfterUpdateWidgetData(
  callback: (
    this: Record<string, any>,
    ...args: [uuid: string, data: Partial<WidgetData>, connection: PoolClient]
  ) => void | Promise<void>,
  priority: number = 10
): void {
  hookAfter('updateWidgetData', callback, priority);
}

export function hookBeforeUpdateWidgetPlacements(
  callback: (
    this: Record<string, any>,
    ...args: [
      widget: { widget_instance_id: number },
      data: Partial<WidgetData>,
      connection: PoolClient
    ]
  ) => void | Promise<void>,
  priority: number = 10
): void {
  hookBefore('updateWidgetPlacements', callback, priority);
}

export function hookAfterUpdateWidgetPlacements(
  callback: (
    this: Record<string, any>,
    ...args: [
      widget: { widget_instance_id: number },
      data: Partial<WidgetData>,
      connection: PoolClient
    ]
  ) => void | Promise<void>,
  priority: number = 10
): void {
  hookAfter('updateWidgetPlacements', callback, priority);
}

export function hookBeforeUpdateWidget(
  callback: (
    this: Record<string, any>,
    ...args: [
      uuid: string,
      data: Partial<WidgetData>,
      context: Record<string, any>
    ]
  ) => void | Promise<void>,
  priority: number = 10
): void {
  hookBefore('updateWidget', callback, priority);
}

export function hookAfterUpdateWidget(
  callback: (
    this: Record<string, any>,
    ...args: [
      uuid: string,
      data: Partial<WidgetData>,
      context: Record<string, any>
    ]
  ) => void | Promise<void>,
  priority: number = 10
): void {
  hookAfter('updateWidget', callback, priority);
}
