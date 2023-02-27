const {
  OK,
  INTERNAL_SERVER_ERROR
} = require('@evershop/evershop/src/lib/util/httpStatus');

// eslint-disable-next-line no-unused-vars
module.exports = async (request, response, deledate, next) => {
  const promises = [];
  // eslint-disable-next-line no-restricted-syntax
  for (const id in deledate) {
    // Check if middleware is async
    if (Promise.resolve(deledate[id]) === deledate[id]) {
      promises.push(deledate[id]);
    }
  }
  try {
    const data = [];
    // Wait for all async middleware to be completed
    const results = await Promise.all(promises);
    // Parse the returned value from previous middleware
    // Each payment method is encouraged to have a middleware to register itself
    for (let i = 0; i < results.length; i += 1) {
      const result = results[i];
      if (result && result.methodCode && result.methodName) {
        // This value will be considered as a payment method
        data.push({ code: result.methodCode, name: result.methodName });
      }
    }

    response.status(OK);
    response.json({
      data: {
        methods: data
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
