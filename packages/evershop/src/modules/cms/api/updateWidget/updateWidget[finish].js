const updateWidget = require('../../services/widget/updateWidget');

// eslint-disable-next-line no-unused-vars
module.exports = async (request, response, delegate) => {
  const data = request.body;
  const widget = await updateWidget(request.params.id, data, {
    routeId: request.currentRoute.id
  });

  return widget;
};
