const jest = require('jest-mock');
module.exports = jest.fn((request, response, stack) => {
  throw new Error('Error in sync');
})
