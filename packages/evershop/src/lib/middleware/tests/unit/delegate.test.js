const { app, bootstrap, close } = require('../app/app');
const axios = require('axios').default;
const http = require('http');

jest.setTimeout(80000);
describe('buildMiddlewareFunction', () => {
  const server = http.createServer(app);
  let port;
  beforeAll(async () => {
    port = await bootstrap(server);
  });

  it('Middleware function return desired value', async () => {
    // Visit a url
    const response = await axios.get(`http://localhost:${port}/delegateTest`, {
      validateStatus: function (status) {
        return status >= 200 && status < 600;
      }
    });

    const test =
      require('../app/modules/delegate/pages/frontStore/delegateTest/collection').test;
    const delegates = test.mock.results[0].value;
    expect(delegates['returnOne']).toEqual(1);
    expect(delegates['returnTwo']).toEqual(undefined);
    expect(delegates['returnThree']).toEqual(3);
  });

  // it('No promising delegate left pending', async () => {
  //   // Visit a url
  //   const response = await axios.get('http://localhost:3002/delegateTest', {
  //     validateStatus: function (status) {
  //       return status >= 200 && status < 600;
  //     },
  //   });

  //   const test = require('../app/modules/delegate/controllers/frontStore/delegateTest/collection').test;
  //   const delegates = test.mock.results[0].value;
  //   const promises = [];
  //   Object.keys(delegates).forEach((id) => {
  //     // Check if middleware is async
  //     if (delegates[id] instanceof Promise) {
  //       promises.push(stack[id]);
  //     }
  //   });
  //   expect(delegates.find((delegate) => delegate.id === '')).toEqual(0);
  // });

  afterAll((done) => {
    close(server, done);
  });
});
