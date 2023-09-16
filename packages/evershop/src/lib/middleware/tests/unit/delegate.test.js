/* eslint-disable no-undef, global-require */
const http = require('http');
const axios = require('axios').default;
const { app, bootstrap, close } = require('../app/app');

jest.setTimeout(80000);
describe('buildMiddlewareFunction', () => {
  const server = http.createServer(app);
  let port;
  beforeAll(async () => {
    port = await bootstrap(server);
  });

  it('Middleware function return desired value', async () => {
    // Visit a url
    await axios.get(`http://localhost:${port}/delegateTest`, {
      validateStatus(status) {
        return status >= 200 && status < 600;
      }
    });

    const {
      test
    } = require('../app/modules/delegate/pages/frontStore/delegateTest/collection');
    const delegates = test.mock.results[0].value;
    expect(delegates.returnOne).toEqual(1);
    expect(delegates.returnTwo).toEqual(undefined);
    expect(delegates.returnThree).toEqual(3);
  });

  afterAll((done) => {
    close(server, done);
  });
});
