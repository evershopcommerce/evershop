import { INTERNAL_SERVER_ERROR, OK } from '../../../../lib/util/httpStatus.js';
import deleteWidget from '../../services/widget/deleteWidget.js';

export default async (request, response, next) => {
  try {
    const { id } = request.params;
    const widget = await deleteWidget(id, {
      routeId: request.currentRoute.id
    });
    response.status(OK);
    response.json({
      data: widget
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
