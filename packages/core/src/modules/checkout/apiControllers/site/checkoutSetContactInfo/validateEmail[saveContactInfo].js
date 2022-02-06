module.exports = async (request, response, stack, next) => {
  // eslint-disable-next-line no-useless-escape
  if (!/^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(request.body.email)) {
    response.json({
      data: {},
      success: false,
      message: 'Invalid email'
    });
  } else {
    next();
  }
};
