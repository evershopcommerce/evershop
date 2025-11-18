import { app, bootstrap, close } from '../app/app.js';
import axios from 'axios';
import http from 'http';
import loadProductAttribute from '../app/modules/handler/pages/frontStore/middleware/[loadProductImage]loadAttribute.js';
import loadProductImage from '../app/modules/handler/pages/frontStore/middleware/[loadProduct]loadProductImage.js';
import loadCategory from '../app/modules/handler/pages/frontStore/middleware/[loadProduct]loadCategory.js';
import loadProduct from '../app/modules/handler/pages/frontStore/middleware/loadProduct[loadAttribute].js';
import loadProductOption from '../app/modules/handler/pages/frontStore/middleware/[loadAttribute]loadOptions.js';
import syncOne from '../app/modules/handler/pages/frontStore/middleware/syncOne[loadAttribute].js';
import asyncOne from '../app/modules/handler/pages/frontStore/middleware/asyncOne[loadAttribute].js';
import checkExecutionOrder from '../app/modules/handler/pages/frontStore/middleware/[syncOne,asyncOne]checkExecutionOrder[loadAttribute].js';
import checkExecutionOrderAsync from '../app/modules/handler/pages/frontStore/middleware/[syncOne,asyncOne]checkExecutionOrderAsync[loadAttribute].js';
import { jest, describe, it, expect, beforeAll, afterAll } from '@jest/globals';

jest.setTimeout(80000);
describe('test middleware', () => {
  const server = http.createServer(app);

  let port;
  beforeAll(async () => {
    port = await bootstrap(server);
  });

  it('It should only execute the next middleware function when the previous one is completed', async () => {
    // Visit a url
    const response = await axios.get(`http://localhost:${port}/middleware`, {
      validateStatus(status) {
        return status >= 200 && status <= 500;
      }
    });
    expect(syncOne).toHaveBeenCalledTimes(1);
    expect(asyncOne).toHaveBeenCalledTimes(1);
    expect(checkExecutionOrder).toHaveBeenCalledTimes(1);
    expect(checkExecutionOrderAsync).toHaveBeenCalledTimes(1);
    expect(loadProductAttribute).toHaveBeenCalledTimes(1);
  });

  it('It should execute the good middleware functions', async () => {
    const response = await axios.get(`http://localhost:${port}/middleware`, {
      validateStatus(status) {
        return status >= 200 && status <= 500;
      }
    });
    expect(loadProductAttribute).toHaveBeenCalledTimes(2);
    expect(loadProductImage).toHaveBeenCalledTimes(2);
    expect(loadCategory).toHaveBeenCalledTimes(2);
    expect(loadProduct).toHaveBeenCalledTimes(2);
  });

  it('It should not execute the middleware functions after error occurred', async () => {
    expect(loadProductOption).toHaveBeenCalledTimes(0);
  });

  afterAll((done) => {
    close(server, done);
  });
});
