// eslint-disable-next-line no-unused-vars
module.exports = (err, request, response, stack, next) => {
  if (request.currentRoute.isApi === true) {
    response.status(500).json({
      success: false,
      message: err.message
    });
  } else {
    response.status(500).send(err.message);
  }
};
