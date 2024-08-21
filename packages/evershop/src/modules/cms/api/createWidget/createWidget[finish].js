const createWidget = require('../../services/widget/createWidget');

// eslint-disable-next-line no-unused-vars
module.exports = async (request, response, delegate) => {
  const data = request.body;
  if (!data.route || (data.route.length === 1 && data.route[0] === '')) {
    data.route = [];
  }
  if (!data.area || (data.area.length === 1 && data.area[0] === '')) {
    data.area = [];
  }
  const result = await createWidget(data, {
    routeId: request.currentRoute.id
  });

  return result;
};
