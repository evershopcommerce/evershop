import { select } from '@evershop/postgres-query-builder';
import { pool } from '../../../../../lib/postgres/connection.js';
import { getEnabledWidgets } from '../../../../../lib/widget/widgetManager.js';
import { EvershopResponse } from '../../../../../types/response.js';
import { setContextValue } from '../../../../graphql/services/contextHelper.js';
import { setPageMetaInfo } from '../../../services/pageMetaInfo.js';

export default async (request, response: EvershopResponse, next) => {
  try {
    const query = select();
    query.from('widget');
    query.andWhere('widget.uuid', '=', request.params.id);
    const widget = await query.load(pool);
    const enabledWidgets = getEnabledWidgets();
    if (
      widget === null ||
      !enabledWidgets.find((row) => row.type === widget.type)
    ) {
      response.status(404);
      next();
    } else {
      setContextValue(request, 'type', widget.type);
      setContextValue(request, 'widgetId', widget.widget_id);
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
