import { INTERNAL_SERVER_ERROR, OK } from '../../../../lib/util/httpStatus.js';
import deleteProductAttribute from '../../services/attribute/deleteProductAttribute.js';

export default async (request, response, next) => {
  try {
    const { id } = request.params;
    const attribute = await deleteProductAttribute(id, {
      routeId: request.currentRoute.id
    });
    response.status(OK);
    response.json({
      data: attribute
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
