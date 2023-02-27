const {
  OK,
  INTERNAL_SERVER_ERROR
} = require('@evershop/evershop/src/lib/util/httpStatus');

// eslint-disable-next-line no-unused-vars
module.exports = async (request, response, delegate, next) => {
  try {
    const promises = [];
    Object.keys(delegate).forEach((id) => {
      // Check if middleware is async
      if (delegate[id] instanceof Promise) {
        promises.push(delegate[id]);
      }
    });

    await Promise.all(promises);
    const results = response.payload || [];

    response.status(OK).json({
      data: { payload: results }
    });
  } catch (e) {
    response.status(INTERNAL_SERVER_ERROR).json({
      error: {
        status: INTERNAL_SERVER_ERROR,
        message: e.message
      }
    });
  }
};
