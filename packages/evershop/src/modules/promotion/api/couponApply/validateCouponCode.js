const {
  INVALID_PAYLOAD
} = require('@evershop/evershop/src/lib/util/httpStatus');

module.exports = async (request, response, delegate, next) => {
  if (!request.body.coupon || !/^\S*$/.test(request.body.coupon)) {
    return response.status(INVALID_PAYLOAD).json({
      error: {
        message: 'Invalid coupon',
        status: INVALID_PAYLOAD
      }
    });
  } else {
    return next();
  }
};
