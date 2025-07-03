import jest from 'jest-mock';

export default jest.fn((request, response) => {
  if (!request.syncOneCompleted) {
    throw new Error('syncOne middleware should be completed first');
  }
  if (!request.asyncOneCompleted) {
    throw new Error('asyncOne middleware should be completed first');
  }
});
