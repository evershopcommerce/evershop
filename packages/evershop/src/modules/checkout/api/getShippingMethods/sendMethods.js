const {
  OK,
  INTERNAL_SERVER_ERROR
} = require('@evershop/evershop/src/lib/util/httpStatus');

// eslint-disable-next-line no-unused-vars
module.exports = async (request, response, delegate, next) => {
  const promises = [];
  // eslint-disable-next-line no-restricted-syntax
  for (const id in delegate) {
    // Check if middleware is async
    if (Promise.resolve(delegate[id]) === delegate[id]) {
      promises.push(delegate[id]);
    }
  }
  try {
    // Wait for all async middleware to be completed
    await Promise.all(promises);
    response.status(OK);
    response.json({
      data: {
        methods: [{ code: 'free', name: 'Free shipping' }] // TODO: this will be handled by each method
      }
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
