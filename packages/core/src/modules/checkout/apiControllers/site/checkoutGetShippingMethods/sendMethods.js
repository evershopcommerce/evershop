// eslint-disable-next-line no-unused-vars
module.exports = async (request, response, stack, next) => {
  const promises = [];
  // eslint-disable-next-line no-restricted-syntax
  for (const id in stack) {
    // Check if middleware is async
    if (Promise.resolve(stack[id]) === stack[id]) { promises.push(stack[id]); }
  }
  try {
    // Wait for all async middleware to be completed
    await Promise.all(promises);
    response.json({
      data: {
        methods: [{ code: 'free', name: 'Free shipping' }] // TODO: this will be handled by each method
      },
      success: true,
      message: ''
    });
  } catch (e) {
    response.json({
      data: {
        methods: []
      },
      success: false,
      message: e.message
    });
  }
};
