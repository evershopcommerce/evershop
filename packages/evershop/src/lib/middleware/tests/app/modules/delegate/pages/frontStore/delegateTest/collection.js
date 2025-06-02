import jest from 'jest-mock';

const test = jest.fn((delegates) => delegates);
function collection(request, response, delegates) {
  test(delegates);
}
export default collection;

export { test };
