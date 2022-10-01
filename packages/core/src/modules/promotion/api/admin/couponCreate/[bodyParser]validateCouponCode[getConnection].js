module.exports = async (request, response, stack, next) => {
  if (!request.body.coupon) {
    response.status(500).json({
      success: false,
      message: 'Coupon code is required'
    });
    return;
  } else if (!/^\S*$/.test(request.body.coupon)) {
    response.status(500).json({
      success: false,
      message: 'Coupon code is required'
    });
    return;
  } else {
    if (!request.body.start_date) {
      request.body.start_date = null;
    }
    if (!request.body.end_date) {
      request.body.end_date = null;
    }
    return next();
  }
};
