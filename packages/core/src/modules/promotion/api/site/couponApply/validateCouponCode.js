module.exports = async (request, response, stack, next) => {
  if (!request.body.coupon || !/^\S*$/.test(request.body.coupon)) {
    response.status(500).json({
      success: false,
      message: 'Coupon code is required'
    });
    return;
  } else {
    return next();
  }
};
