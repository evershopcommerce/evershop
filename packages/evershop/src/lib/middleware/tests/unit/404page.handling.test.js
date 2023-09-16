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

  it('It should return 404 page when route is not exist', async () => {
    // Visit a url
    const response = await axios.get(
      `http://localhost:${port}/noexistedroute`,
      {
        validateStatus(status) {
          return status >= 200 && status < 500;
        }
      }
    );
    expect(response.status).toEqual(404);
  });

  it('It should return 404 page when middleware sets status to 404', async () => {
    // Visit a url
    const response = await axios.get(`http://localhost:${port}/product/404`, {
      validateStatus(status) {
        return status >= 200 && status < 500;
      }
    });
    expect(response.status).toEqual(404);
  });

  it('It should bypass the rouded middleware when status is 404', async () => {
    const loadProductImage = require('../app/modules/404page/pages/frontStore/product/[loadProduct]loadProductImage');
    const loadCategory = require('../app/modules/404page/pages/frontStore/product/[loadProduct]loadCategory');
    const loadProduct = require('../app/modules/404page/pages/frontStore/product/loadProduct');
    expect(loadProductImage).toHaveBeenCalledTimes(0);
    expect(loadCategory).toHaveBeenCalledTimes(0);
    expect(loadProduct).toHaveBeenCalledTimes(1);
  });

  it('It should not bypass the app level middleware when status is 404', async () => {
    const notFound = require('../app/modules/basecopy/pages/global/[notification]notFound[response]');
    const dummy = require('../app/modules/basecopy/pages/global/[notFound]dummy[response]');
    const response = require('../app/modules/basecopy/pages/global/response[errorHandler]');
    expect(notFound).toHaveBeenCalledTimes(2);
    expect(dummy).toHaveBeenCalledTimes(2);
    expect(response).toHaveBeenCalledTimes(2);
  });

  afterAll((done) => {
    close(server, done);
  });
});
