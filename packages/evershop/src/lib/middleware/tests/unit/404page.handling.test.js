import http from 'http';
import axios from 'axios';
import { app, bootstrap, close } from '../app/app.js';
import notFound from '../app/modules/basecopy/pages/global/[auth]notFound[response].js';
import dummy from '../app/modules/basecopy/pages/global/[notFound]dummy[response].js';
import response from '../app/modules/basecopy/pages/global/response[errorHandler].js';
import loadProductImage from '../app/modules/404page/pages/frontStore/product/[loadProduct]loadProductImage.js';
import loadCategory from '../app/modules/404page/pages/frontStore/product/[loadProduct]loadCategory.js';
import loadProduct from '../app/modules/404page/pages/frontStore/product/loadProduct.js';

import { jest, describe, it, expect, beforeAll, afterAll } from '@jest/globals';

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
          return status >= 200 && status < 600;
        }
      }
    );
    expect(response.status).toEqual(404);
    expect(notFound).toHaveBeenCalledTimes(1);
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
    expect(loadProductImage).toHaveBeenCalledTimes(0);
    expect(loadCategory).toHaveBeenCalledTimes(0);
    expect(loadProduct).toHaveBeenCalledTimes(1);
  });

  it('It should not bypass the app level middleware when status is 404', async () => {
    expect(notFound).toHaveBeenCalledTimes(2);
    expect(dummy).toHaveBeenCalledTimes(2);
    expect(response).toHaveBeenCalledTimes(2);
  });

  afterAll((done) => {
    close(server, done);
  });
});
