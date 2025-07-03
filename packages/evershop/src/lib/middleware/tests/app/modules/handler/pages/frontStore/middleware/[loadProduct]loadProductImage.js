import jest from 'jest-mock';

export default jest.fn(async (request, response, next) => {
  next();
});
