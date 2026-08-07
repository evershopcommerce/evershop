import jest from 'jest-mock';

export default jest.fn((request, response) => {
  throw new Error('this is an error');
});
