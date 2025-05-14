import jest from 'jest-mock';

export default jest.fn(async (request, response, delegates, next) => {
  try {
    response.status(404);
    next();
  } catch (e) {
    next(e);
  }
});
