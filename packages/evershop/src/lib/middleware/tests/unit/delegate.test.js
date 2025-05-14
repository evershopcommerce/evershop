import http from 'http';
import axios from 'axios';
import { app, bootstrap, close } from '../app/app.js';
import { test } from '../app/modules/delegate/pages/frontStore/delegateTest/collection.js';

import { jest, describe, it, expect, beforeAll, afterAll } from '@jest/globals';

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

    const delegates = test.mock.results[0].value;
    expect(delegates.returnOne).toEqual(1);
    expect(delegates.returnTwo).toEqual(undefined);
    expect(delegates.returnThree).toEqual(3);
  });

  afterAll((done) => {
    close(server, done);
  });
});
