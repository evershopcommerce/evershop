const createWidget = require('../../services/widget/createWidget');

// eslint-disable-next-line no-unused-vars
module.exports = async (request, response, delegate) => {
  const data = request.body;
  const result = await createWidget(data, {
    routeId: request.currentRoute.id
  });

  return result;
};
