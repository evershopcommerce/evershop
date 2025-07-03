import { OK, INTERNAL_SERVER_ERROR } from '../../../../lib/util/httpStatus.js';
import deleteProduct from '../../services/product/deleteProduct.js';

export default async (request, response, next) => {
  try {
    const { id } = request.params;
    const product = await deleteProduct(id, {
      routeId: request.currentRoute.id
    });
    response.status(OK);
    response.json({
      data: product
    });
  } catch (e) {
    response.status(INTERNAL_SERVER_ERROR);
    response.json({
      error: {
        status: INTERNAL_SERVER_ERROR,
        message: e.message
      }
    });
  }
};
