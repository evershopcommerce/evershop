import { getEnabledWidgets } from '../../../../../lib/util/getEnabledWidgets.js';
import { buildUrl } from '../../../../../lib/router/buildUrl.js';
import { setContextValue } from '../../../../graphql/services/contextHelper.js';

// eslint-disable-next-line no-unused-vars
export default (request, response, delegate, next) => {
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
