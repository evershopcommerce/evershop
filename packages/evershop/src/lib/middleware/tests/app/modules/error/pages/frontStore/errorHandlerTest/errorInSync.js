const jest = require('jest-mock');

module.exports = jest.fn((request, response, delegates) => {
  throw new Error('Error in sync');
});
