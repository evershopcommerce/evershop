const {
  getEnabledWidgets
} = require('@evershop/evershop/src/lib/util/getEnabledWidgets');
const { buildUrl } = require('@evershop/evershop/src/lib/router/buildUrl');
const {
  setContextValue
} = require('../../../../graphql/services/contextHelper');

// eslint-disable-next-line no-unused-vars
module.exports = (request, response, delegate, next) => {
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
