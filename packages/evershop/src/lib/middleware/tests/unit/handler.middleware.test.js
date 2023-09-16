/* eslint-disable no-undef, global-require */
const { app, bootstrap, close } = require('../app/app');
const axios = require('axios').default;
const http = require('http');

jest.setTimeout(80000);
describe('test middleware', () => {
  const server = http.createServer(app);

  let port;
  beforeAll(async () => {
    port = await bootstrap(server);
  });

  it('It should execute the good middleware functions', async () => {
    await axios.get(`http://localhost:${port}/middleware`, {
      validateStatus(status) {
        return status >= 200 && status <= 500;
      }
    });
    const loadProductAttribute = require('../app/modules/handler/pages/frontStore/middleware/[loadProductImage]loadAttribute');
    const loadProductImage = require('../app/modules/handler/pages/frontStore/middleware/[loadProduct]loadProductImage');
    const loadCategory = require('../app/modules/handler/pages/frontStore/middleware/[loadProduct]loadCategory');
    const loadProduct = require('../app/modules/handler/pages/frontStore/middleware/loadProduct');
    expect(loadProductAttribute).toHaveBeenCalledTimes(1);
    expect(loadProductImage).toHaveBeenCalledTimes(1);
    expect(loadCategory).toHaveBeenCalledTimes(1);
    expect(loadProduct).toHaveBeenCalledTimes(1);
  });

  it('It should not execute the middleware functions after error occurred', async () => {
    const loadProductOption = require('../app/modules/handler/pages/frontStore/middleware/[loadAttribute]loadOptions');
    expect(loadProductOption).toHaveBeenCalledTimes(0);
  });

  afterAll((done) => {
    close(server, done);
  });
});
