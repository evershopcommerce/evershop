import { app, bootstrap, close } from '../app/app.js';
import axios from 'axios';
import http from 'http';
import loadProductAttribute from '../app/modules/handler/pages/frontStore/middleware/[loadProductImage]loadAttribute.js';
import loadProductImage from '../app/modules/handler/pages/frontStore/middleware/[loadProduct]loadProductImage.js';
import loadCategory from '../app/modules/handler/pages/frontStore/middleware/[loadProduct]loadCategory.js';
import loadProduct from '../app/modules/handler/pages/frontStore/middleware/loadProduct.js';
import loadProductOption from '../app/modules/handler/pages/frontStore/middleware/[loadAttribute]loadOptions.js';
import { jest, describe, it, expect, beforeAll, afterAll } from '@jest/globals';

jest.setTimeout(80000);
describe('test middleware', () => {
  const server = http.createServer(app);

  let port;
  beforeAll(async () => {
    port = await bootstrap(server);
  });

  it('It should execute the good middleware functions', async () => {
    const response = await axios.get(`http://localhost:${port}/middleware`, {
      validateStatus(status) {
        return status >= 200 && status <= 500;
      }
    });
    expect(loadProductAttribute).toHaveBeenCalledTimes(1);
    expect(loadProductImage).toHaveBeenCalledTimes(1);
    expect(loadCategory).toHaveBeenCalledTimes(1);
    expect(loadProduct).toHaveBeenCalledTimes(1);
  });

  it('It should not execute the middleware functions after error occurred', async () => {
    expect(loadProductOption).toHaveBeenCalledTimes(0);
  });

  afterAll((done) => {
    close(server, done);
  });
});
