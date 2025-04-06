import createProduct from '../../services/product/createProduct.js';

// eslint-disable-next-line no-unused-vars
export default async (request, response, delegate) => {
  const result = await createProduct(request.body, {
    routeId: request.currentRoute.id
  });
  return result;
};
