const updateCategory = require('../../services/category/updateCategory');

// eslint-disable-next-line no-unused-vars
module.exports = async (request, response, delegate) => {
  const category = await updateCategory(request.params.id, request.body, {
    routeId: request.currentRoute.id
  });
  return category;
};
