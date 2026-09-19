import { EvershopRequest } from '../../../../types/request.js';
import { EvershopResponse } from '../../../../types/response.js';
import updateProduct from '../../services/product/updateProduct.js';

export default async (request: EvershopRequest, response: EvershopResponse) => {
  const product = await updateProduct(
    Array.isArray(request.params.id) ? request.params.id[0] : request.params.id,
    request.body,
    {
      routeId: request.currentRoute.id
    }
  );
  return product;
};
