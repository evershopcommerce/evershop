const { app, bootstrap, close } = require('../app/app');
const axios = require('axios').default;
const http = require('http');

jest.setTimeout(800000);
describe('buildMiddlewareFunction', () => {
  const server = http.createServer(app);

  let port;
  beforeAll(async () => {
    port = await bootstrap(server);
  });

  it('It should return 500 error when a error occurred', async () => {
    // Visit a url
    const response = await axios.get(
      `http://localhost:${port}/errorHandlerTest`,
      {
        validateStatus (status) {
          return status >= 200 && status < 600;
        }
      }
    );
    expect(response.status).toEqual(500);
    expect(response.data.split(/\r\n|\r|\n/).length).toEqual(1);
  });

  it('The error handler middleware should be executed only one time per request', async () => {
    const errorHandler = require('../app/modules/basecopy/pages/global/[response]errorHandler');
    expect(errorHandler).toHaveBeenCalledTimes(1);
  });

  afterAll((done) => {
    close(server, done);
  });
});
