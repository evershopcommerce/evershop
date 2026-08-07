import jest from 'jest-mock';

export default jest.fn(async (request, response, next) => {
  try {
    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    await delay(3000);
    undefined.a = 1;
    next();
  } catch (e) {
    next(e);
  }
});
