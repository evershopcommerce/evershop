import { select } from '@evershop/postgres-query-builder';
import { pool } from '../../../../../lib/postgres/connection.js';
import { getActiveTheme } from '../../../../../lib/util/getActiveTheme.js';
import { getEnabledWidgets } from '../../../../../lib/widget/widgetManager.js';
import { EvershopResponse } from '../../../../../types/response.js';
import { setContextValue } from '../../../../graphql/services/contextHelper.js';
import { setPageMetaInfo } from '../../../services/pageMetaInfo.js';

export default async (request, response: EvershopResponse, next) => {
  try {
    const query = select();
    // Renamed in cms migration 1.3.0: widget → widget_instance.
    query.from('widget_instance');
    query.andWhere('widget_instance.uuid', '=', request.params.id);
    const widget = await query.load(pool);
    const enabledWidgets = getEnabledWidgets();
    // Theme isolation (spec 04 § 2): the standalone editor only opens widgets
    // in the active theme. A widget tagged for a dormant theme is treated as
    // not found — switch the active theme to edit it.
    const activeTheme = getActiveTheme();
    if (
      widget === null ||
      !enabledWidgets.find((row) => row.type === widget.type) ||
      (widget.theme ?? null) !== activeTheme
    ) {
      response.status(404);
      next();
    } else {
      setContextValue(request, 'type', widget.type);
      // Keep the old context key name `widgetId` for backward compat with any
      // GraphQL queries / templates that read it; the value is now the
      // widget_instance_id.
      setContextValue(request, 'widgetId', widget.widget_instance_id);
      setContextValue(request, 'widgetUuid', widget.uuid);
      setPageMetaInfo(request, {
        title: widget.name,
        description: widget.name
      });
      next();
    }
  } catch (e) {
    next(e);
  }
};
