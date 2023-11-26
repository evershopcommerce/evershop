const updateProduct = require('../../services/product/updateProduct');

// eslint-disable-next-line no-unused-vars
module.exports = async (request, response, delegate) => {
  const product = await updateProduct(request.params.id, request.body, {
    routeId: request.currentRoute.id
  });
  return product;
};
