const updatePage = require('../../services/page/updatePage');

module.exports = async (request, response, delegate) => {
  const data = request.body;
  const page = await updatePage(request.params.id, data, {
    routeId: request.currentRoute.id
  });

  return page;
};
