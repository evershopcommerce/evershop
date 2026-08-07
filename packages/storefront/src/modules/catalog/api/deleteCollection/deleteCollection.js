import { OK, INTERNAL_SERVER_ERROR } from '../../../../lib/util/httpStatus.js';
import deleteCollection from '../../services/collection/deleteCollection.js';

export default async (request, response, next) => {
  try {
    const { id } = request.params;
    const collection = await deleteCollection(id, {
      routeId: request.currentRoute.id
    });
    response.status(OK);
    response.json({
      data: collection
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
