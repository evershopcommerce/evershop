import http from 'http';
import axios from 'axios';
import { app, bootstrap, close } from '../app/app.js';
import createA from '../app/modules/api/api/createA/index.js';
import afterIndex from '../app/modules/authcopy/api/createA/[index]afterIndex.js';
import createAGlobal from '../app/modules/api/api/global/apiGlobal.js';
import authApiGlobal from '../app/modules/authcopy/api/global/apiAuthGlobal.js';

import { jest, describe, it, expect, beforeAll, afterAll } from '@jest/globals';
jest.setTimeout(80000);
describe('test API middleware', () => {
  const server = http.createServer(app);

  let port;
  beforeAll(async () => {
    port = await bootstrap(server);
  });

  it('It should execute the valid middleware functions', async () => {
    try {
      await axios.post(`http://localhost:${port}/api/as`, {
        validateStatus(status) {
          return status >= 200 && status < 600;
        }
      });
    } catch (e) {
      console.log(e.response.data);
    }
    expect(createA).toHaveBeenCalledTimes(1);
    expect(afterIndex).toHaveBeenCalledTimes(1);
    expect(createAGlobal).toHaveBeenCalledTimes(1);
    expect(authApiGlobal).toHaveBeenCalledTimes(1);
  });

  afterAll((done) => {
    close(server, done);
  });
});
