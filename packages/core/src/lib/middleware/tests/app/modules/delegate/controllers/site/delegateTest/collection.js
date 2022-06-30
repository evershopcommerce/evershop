const jest = require('jest-mock');

const test = jest.fn((delegates) => {
  return delegates;
});
function collection(request, response, stack) {
  test(stack);
}
const myModule = module.exports = collection;

myModule.test = test;
