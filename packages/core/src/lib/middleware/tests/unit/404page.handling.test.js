const { bootstrap, close } = require('../app/app');
const axios = require('axios').default;

jest.setTimeout(80000);

describe('buildMiddlewareFunction', () => {
  let port;
  beforeAll(async () => {
    port = await bootstrap();
    console.log('404', port)
  });

  it('It should return 404 page when route is not exist', async () => {
    // Visit a url
    const response = await axios.get(`http://localhost:${port}/noexistedroute`, {
      validateStatus: function (status) {
        return status >= 200 && status < 500;
      },
    });
    expect(response.status).toEqual(404);
  });

  it('It should return 404 page when middleware sets status to 404', async () => {
    // Visit a url
    const response = await axios.get(`http://localhost:${port}/product/404`, {
      validateStatus: function (status) {
        return status >= 200 && status < 500;
      },
    });
    expect(response.status).toEqual(404);
  });

  it('It should bypass the rouded middleware when status is 404', async () => {
    const loadProductImage = require('../app/modules/404page/controllers/site/product/[loadProduct]loadProductImage');
    const loadCategory = require('../app/modules/404page/controllers/site/product/[loadProduct]loadCategory');
    const loadProduct = require('../app/modules/404page/controllers/site/product/loadProduct');
    expect(loadProductImage).toHaveBeenCalledTimes(0);
    expect(loadCategory).toHaveBeenCalledTimes(0);
    expect(loadProduct).toHaveBeenCalledTimes(1);
  });

  it('It should not bypass the app level middleware when status is 404', async () => {
    const notFound = require('../app/modules/cmscopy/controllers/[notification]notFound[response]');
    const dummy = require('../app/modules/cmscopy/controllers/[notFound]dummy[response]');
    const response = require('../app/modules/cmscopy/controllers/response[errorHandler]');
    expect(notFound).toHaveBeenCalledTimes(2);
    expect(dummy).toHaveBeenCalledTimes(2);
    expect(response).toHaveBeenCalledTimes(2);
  });

  afterAll(async () => {
    await close();
  });
});
