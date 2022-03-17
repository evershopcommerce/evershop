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

    response.json({
      success: true,
      data: { payload: results }
    });
  } catch (e) {
    response.json({
      success: false,
      message: e.message,
      data: { payload: [] }
    });
  }
};
