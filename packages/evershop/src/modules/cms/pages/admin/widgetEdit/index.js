const { select } = require('@evershop/postgres-query-builder');
const { pool } = require('@evershop/evershop/src/lib/postgres/connection');
const {
  getEnabledWidgets
} = require('@evershop/evershop/src/lib/util/getEnabledWidgets');
const {
  setContextValue
} = require('../../../../graphql/services/contextHelper');

module.exports = async (request, response, delegate, next) => {
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
      setContextValue(request, 'pageInfo', {
        title: widget.name,
        description: widget.name
      });
      next();
    }
  } catch (e) {
    next(e);
  }
};
