const jest = require('jest-mock');

const test = jest.fn((delegates) => delegates);
function collection(request, response, delegates) {
  test(delegates);
}
const myModule = (module.exports = collection);

myModule.test = test;
