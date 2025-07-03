import jest from 'jest-mock';

export default jest.fn(async (request, response, next) => {
  try {
    response.status(404);
    next();
  } catch (e) {
    next(e);
  }
});
