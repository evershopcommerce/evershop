const jest = require('jest-mock');

module.exports = jest.fn((request, response, delegates, next) => {
  next(new Error('Error in sync with next'));
});
