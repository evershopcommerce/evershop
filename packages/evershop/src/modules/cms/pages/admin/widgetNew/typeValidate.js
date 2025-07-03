import { buildUrl } from '../../../../../lib/router/buildUrl.js';
import { getEnabledWidgets } from '../../../../../lib/widget/widgetManager.js';
import { setContextValue } from '../../../../graphql/services/contextHelper.js';

export default (request, response, next) => {
  const { type } = request.params;
  const enabledWidgets = getEnabledWidgets();

  if (!enabledWidgets.find((widget) => widget.type === type)) {
    // Redirect to the widget grid if the widget type is not found
    response.redirect(buildUrl('widgetGrid'));
  } else {
    setContextValue(request, 'type', type);
    next();
  }
};
