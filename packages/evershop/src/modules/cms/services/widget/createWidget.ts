import {
  commit,
  insert,
  PoolClient,
  rollback,
  startTransaction
} from '@evershop/postgres-query-builder';
import { getConnection } from '../../../../lib/postgres/connection.js';
import { getActiveTheme } from '../../../../lib/util/getActiveTheme.js';
import {
  hookable,
  hookBefore,
  hookAfter
} from '../../../../lib/util/hookable.js';
import { getValue, getValueSync } from '../../../../lib/util/registry.js';
import { getWidgetSchemaValidator } from '../../../../lib/widget/widgetManager.js';
import { getAjv } from '../../../base/services/getAjv.js';
import widgetDataSchema from './widgetDataSchema.json' with { type: 'json' };

export type WidgetData = {
  name: string;
  status: number;
  sort_order: number;
  route?: string[];
  area?: string[];
  [key: string]: unknown;
};

function validateWidgetDataBeforeInsert(data: WidgetData): WidgetData {
  const ajv = getAjv();
  // `sort_order` is per-placement now (it moved to widget_placement), so it is
  // no longer a required top-level field.
  (widgetDataSchema as any).required = ['status', 'name'];
  const jsonSchema = getValueSync(
    'createWidgetDataJsonSchema',
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
 * Insert a single widget_instance row. The route/area/sort_order fields in
 * `data` are silently ignored here — they belong to widget_placement, not
 * widget_instance, post-migration-1.3.0. They're consumed by
 * `insertWidgetPlacements()` below.
 */
async function insertWidgetData(data: WidgetData, connection: PoolClient) {
  const widget = await insert('widget_instance').given(data).execute(connection);
  return widget;
}

/**
 * Insert one widget_placement row per (route, area) cell from the cross-product
 * of `data.route` × `data.area`. Empty arrays produce zero placements, which is
 * the same render-time behavior as the pre-1.3.0 schema (the widget existed
 * but appeared nowhere).
 */
async function insertWidgetPlacements(
  widget: { widget_instance_id: number },
  data: WidgetData,
  connection: PoolClient
) {
  // Placements carry a denormalized copy of the instance theme (spec 04
  // § 4.2) so the storefront can filter placements without a join.
  const theme = (data.theme as string | null) ?? null;

  // Preferred shape: an explicit list of placements, each with its own
  // (route, area, sort_order) — one widget_placement row per entry.
  if (Array.isArray(data.placements)) {
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

  // Legacy shape: cross-product of route[] × area[] sharing one sort_order.
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
          sort_order: sortOrder,
          theme
        })
        .execute(connection);
    }
  }
}

/**
 * Create widget service. This service will create a widget with all related data
 * @param {Object} data
 * @param {Object} context
 */
async function createWidget(data: WidgetData, context: Record<string, any>) {
  const connection = await getConnection();
  await startTransaction(connection);
  try {
    const widgetData = await getValue('widgetDataBeforeCreate', data);
    // Validate widget data envelope (name, status, sort_order, etc.).
    validateWidgetDataBeforeInsert(widgetData);

    // Phase 2b — validate settings against the widget's registered JSON Schema.
    // Widgets registered without a schema have no validator and skip this step.
    if (widgetData.type) {
      const validator = getWidgetSchemaValidator(widgetData.type as string);
      if (validator) {
        const ok = validator(widgetData.settings ?? {});
        if (!ok) {
          throw new Error(
            `Widget settings failed schema validation: ${JSON.stringify(
              validator.errors
            )}`
          );
        }
      }
    }

    // Stamp the active theme so the new widget lands in the current theme's
    // bucket (storefront, page-builder, and the widget grid are theme-scoped
    // — spec 04 § 2). Server-authoritative: set after validation so a client
    // payload can't pick a different theme.
    widgetData.theme = getActiveTheme();

    // Insert widget instance row
    const widget = await hookable(insertWidgetData, { ...context, connection })(
      widgetData,
      connection
    );

    // Insert placements (cross-product of route × area).
    await hookable(insertWidgetPlacements, {
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

export default async (data: WidgetData, context: Record<string, any>) => {
  // Make sure the context is either not provided or is an object
  if (context && typeof context !== 'object') {
    throw new Error('Context must be an object');
  }
  const widget = await hookable(createWidget, context)(data, context);
  return widget;
};

export function hookBeforeInsertWidgetData(
  callback: (
    this: Record<string, any>,
    ...args: [data: WidgetData, connection: PoolClient]
  ) => void | Promise<void>,
  priority: number = 10
): void {
  hookBefore('insertWidgetData', callback, priority);
}

export function hookAfterInsertWidgetData(
  callback: (
    this: Record<string, any>,
    ...args: [data: WidgetData, connection: PoolClient]
  ) => void | Promise<void>,
  priority: number = 10
): void {
  hookAfter('insertWidgetData', callback, priority);
}

export function hookBeforeInsertWidgetPlacements(
  callback: (
    this: Record<string, any>,
    ...args: [
      widget: { widget_instance_id: number },
      data: WidgetData,
      connection: PoolClient
    ]
  ) => void | Promise<void>,
  priority: number = 10
): void {
  hookBefore('insertWidgetPlacements', callback, priority);
}

export function hookAfterInsertWidgetPlacements(
  callback: (
    this: Record<string, any>,
    ...args: [
      widget: { widget_instance_id: number },
      data: WidgetData,
      connection: PoolClient
    ]
  ) => void | Promise<void>,
  priority: number = 10
): void {
  hookAfter('insertWidgetPlacements', callback, priority);
}

export function hookBeforeCreateWidget(
  callback: (
    this: Record<string, any>,
    ...args: [data: WidgetData, context: Record<string, any>]
  ) => void | Promise<void>,
  priority: number = 10
): void {
  hookBefore('createWidget', callback, priority);
}

export function hookAfterCreateWidget(
  callback: (
    this: Record<string, any>,
    ...args: [data: WidgetData, context: Record<string, any>]
  ) => void | Promise<void>,
  priority: number = 10
): void {
  hookAfter('createWidget', callback, priority);
}
