const createPage = require('../../services/page/createPage');

// eslint-disable-next-line no-unused-vars
module.exports = async (request, response, delegate) => {
  const data = request.body;
  const result = await createPage(data, {
    routeId: request.currentRoute.id
  });

  return result;
};
