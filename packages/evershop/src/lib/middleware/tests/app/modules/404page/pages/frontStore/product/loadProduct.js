const jest = require('jest-mock');

module.exports = jest.fn(async (request, response, delegates, next) => {
  try {
    response.status(404);
    next();
  } catch (e) {
    next(e);
  }
});
