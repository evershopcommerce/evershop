const { bootstrap, close } = require('../app/app');
const axios = require('axios').default;

jest.setTimeout(10000000);
describe('buildMiddlewareFunction', () => {
  let port;
  beforeAll(async () => {
    port = await bootstrap();
    console.log('error', port);
  });

  it('It should return 500 error when a error occurred', async () => {
    // Visit a url
    const response = await axios.get(`http://localhost:${port}/errorHandlerTest`, {
      validateStatus: function (status) {
        return status >= 200 && status < 600;
      },
    });
    console.log(response.data);
    expect(response.status).toEqual(500);
    expect(response.data.split(/\r\n|\r|\n/).length).toEqual(1);
  });

  it('The error handler middleware should be executed only one time per request', async () => {
    const errorHandler = require('../app/modules/cmscopy/controllers/[response]errorHandler');
    expect(errorHandler).toHaveBeenCalledTimes(1);
  });

  afterAll(async () => {
    await close();
  });
});
