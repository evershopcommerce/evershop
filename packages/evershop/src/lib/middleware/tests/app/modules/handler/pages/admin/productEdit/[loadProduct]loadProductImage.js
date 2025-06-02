import jest from 'jest-mock';

export default jest.fn(async (request, response, delegates, next) => {
  next();
});
