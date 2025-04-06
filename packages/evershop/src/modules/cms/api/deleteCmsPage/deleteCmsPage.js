import {
  OK,
  INTERNAL_SERVER_ERROR
} from '@evershop/evershop/src/lib/util/httpStatus.js';
import deletePage from '../../services/page/deletePage.js';

// eslint-disable-next-line no-unused-vars
export default async (request, response, delegate, next) => {
  try {
    const { id } = request.params;
    const page = await deletePage(id, {
      routeId: request.currentRoute.id
    });
    response.status(OK);
    response.json({
      data: page
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
