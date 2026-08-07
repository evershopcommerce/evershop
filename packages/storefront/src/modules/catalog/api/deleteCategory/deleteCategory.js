import { INTERNAL_SERVER_ERROR, OK } from '../../../../lib/util/httpStatus.js';
import deleteCategory from '../../services/category/deleteCategory.js';

export default async (request, response, next) => {
  try {
    const { id } = request.params;
    const category = await deleteCategory(id, {
      routeId: request.currentRoute.id
    });
    response.status(OK);
    response.json({
      data: category
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
