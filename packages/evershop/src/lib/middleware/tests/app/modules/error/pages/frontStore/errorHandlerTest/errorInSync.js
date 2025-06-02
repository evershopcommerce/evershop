import jest from 'jest-mock';

export default jest.fn((request, response, delegates) => {
  throw new Error('Error in sync');
});
