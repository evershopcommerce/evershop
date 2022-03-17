const bundlee = require('../../../lib/bundlee');

module.exports = async (request, response) => {
  const route = request.currentRoute;

  await bundlee(request, response, route);
};
