const { INVALID_PAYLOAD } = require('../../../../lib/util/httpStatus');

module.exports = async (request, response, delegate, next) => {
  if (!request.body.coupon || !/^\S*$/.test(request.body.coupon)) {
    response.status(INVALID_PAYLOAD).json({
      error: {
        message: 'Invalid coupon',
        status: INVALID_PAYLOAD
      }
    });
  } else {
    return next();
  }
};
