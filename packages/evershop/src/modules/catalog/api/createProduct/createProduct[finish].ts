import { EvershopRequest } from '../../../../types/request.js';
import { EvershopResponse } from '../../../../types/response.js';
import createProduct from '../../services/product/createProduct.js';

export default async (request: EvershopRequest, response: EvershopResponse) => {
  const result = await createProduct(request.body, {
    routeId: request.currentRoute.id
  });
  return result;
};
