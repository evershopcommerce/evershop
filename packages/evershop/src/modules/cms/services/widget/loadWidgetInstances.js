import { select } from '@evershop/postgres-query-builder';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../../../../lib/postgres/connection.js';
import { getEnabledWidgets } from '../../../../lib/widget/widgetManager.js';

const newUUID = uuidv4();
export async function loadWidgetInstances(request) {
  const route = request.currentRoute;
  if (route.isAdmin && !['widgetEdit', 'widgetNew'].includes(route.id)) {
    return [];
  }
  const enabledWidgets = getEnabledWidgets();
  const query = select().from('widget');
  if (!route.isAdmin) {
    query.where('status', '=', 't');
  } else if (route.id === 'widgetEdit') {
    const uuid = request.params.id;
    query.where('uuid', '=', uuid);
  } else {
    const { type } = request.params;
    return enabledWidgets
      .map((widget) => ({
        type: widget.type,
        areaId: 'widget_setting_form',
        uuid: newUUID,
        sortOrder: 0,
        settings: widget.defaultSettings || {}
      }))
      .filter((widget) => widget.type === type);
  }

  const node = query.andWhere(
    'type',
    'in',
    enabledWidgets.map((widget) => widget.type)
  );

  if (!route.isAdmin) {
    node.addRaw('AND', `(route @> '["all"]' OR route @> '["${route.id}"]')`);
  }
  query.orderBy('sort_order', 'asc');
  const widgetInstances = await query.execute(pool);
  return widgetInstances.map((widgetInstance) => ({
    type: widgetInstance.type,
    uuid: widgetInstance.uuid,
    areaId: widgetInstance.area,
    settings: widgetInstance.settings,
    sortOrder: widgetInstance.sort_order
  }));
}
