const {
  OK,
  INTERNAL_SERVER_ERROR
} = require('@evershop/evershop/src/lib/util/httpStatus');
const { cancelOrder } = require('../../services/cancelOrder');

// eslint-disable-next-line no-unused-vars
module.exports = async (request, response, deledate, next) => {
  try {
    const { reason } = request.body;
    await cancelOrder(request.params.id, reason);
    response.status(OK);
    response.json({
      data: {}
    });
  } catch (err) {
    response.status(INTERNAL_SERVER_ERROR);
    response.json({
      error: {
        status: INTERNAL_SERVER_ERROR,
        message: err.message
      }
    });
  }
};
