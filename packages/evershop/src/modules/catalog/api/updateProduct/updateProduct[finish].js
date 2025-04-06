import updateProduct from '../../services/product/updateProduct.js';

// eslint-disable-next-line no-unused-vars
export default async (request, response, delegate) => {
  const product = await updateProduct(request.params.id, request.body, {
    routeId: request.currentRoute.id
  });
  return product;
};
