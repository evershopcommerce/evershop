const {
  OK,
  INTERNAL_SERVER_ERROR
} = require('../../../../lib/util/httpStatus');
const deleteCollection = require('../../services/collection/deleteCollection');

module.exports = async (request, response, delegate, next) => {
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
