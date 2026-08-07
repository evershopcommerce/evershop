import updateProduct from '../../services/product/updateProduct.js';

export default async (request, response) => {
  const product = await updateProduct(request.params.id, request.body, {
    routeId: request.currentRoute.id
  });
  return product;
};
