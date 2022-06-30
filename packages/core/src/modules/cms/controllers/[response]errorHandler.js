// eslint-disable-next-line no-unused-vars
module.exports = async (err, request, response, stack, next) => {
  console.log('bbbb')
  // Set this flag to make sure this middleware only be executed 1 time
  response.locals.errorHandlerTriggered = true;
  const promises = [];
  Object.keys(stack).forEach((id) => {
    // Check if middleware is async
    if (stack[id] instanceof Promise) {
      promises.push(stack[id]);
    }
  });
  console.log(promises)
  // Wait for all executing async middleware to be settled before sending response
  await Promise.allSettled(promises);
  console.log('allSettled')
  // Check if the header is already sent or not.
  if (response.headersSent) {
    console.log('headersSent')
    return; //TODO: Write a log message or next(error)?.
  } else {
    console.log('aaaaa')
    if (request.currentRoute.isApi === true) {
      response.status(500).json({
        success: false,
        message: err.message
      });
    } else {
      response.status(500).send(err.message);
    }
  }
};
