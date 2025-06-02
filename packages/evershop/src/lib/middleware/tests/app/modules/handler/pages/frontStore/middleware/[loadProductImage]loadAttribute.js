import jest from 'jest-mock';

export default jest.fn((request, response, delegates) => {
  console.log('loadAttribute');
  throw new Error('this is an error');
});
