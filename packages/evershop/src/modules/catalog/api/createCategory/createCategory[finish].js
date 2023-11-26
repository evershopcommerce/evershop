const createCategory = require('../../services/category/createCategory');

// eslint-disable-next-line no-unused-vars
module.exports = async (request, response, delegate) => {
  const result = await createCategory(request.body, {
    routeId: request.currentRoute.id
  });
  return result;
};
