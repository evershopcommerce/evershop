import { app, bootstrap, close } from '../app/app.js';
import axios from 'axios';
import http from 'http';
import errorHandler from '../app/modules/basecopy/pages/global/[response]errorHandler.js';

import { jest, describe, it, expect, beforeAll, afterAll } from '@jest/globals';

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
        validateStatus(status) {
          return status >= 200 && status < 600;
        }
      }
    );
    expect(response.status).toEqual(500);
    expect(response.data.split(/\r\n|\r|\n/).length).toEqual(1);
  });

  it('The error handler middleware should be executed only one time per request', async () => {
    expect(errorHandler).toHaveBeenCalledTimes(1);
  });

  afterAll((done) => {
    close(server, done);
  });
});
