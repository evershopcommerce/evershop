const jest = require('jest-mock');
module.exports = jest.fn(async (request, response, stack, next) => {
  next();
});
