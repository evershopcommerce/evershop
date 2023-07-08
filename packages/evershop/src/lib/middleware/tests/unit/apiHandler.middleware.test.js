const { app, bootstrap, close } = require('../app/app');
const axios = require('axios').default;
const http = require('http');

jest.setTimeout(80000);
describe('test API middleware', () => {
  const server = http.createServer(app);

  let port;
  beforeAll(async () => {
    port = await bootstrap(server);
  });

  it('It should execute the valid middleware functions', async () => {
    await axios.post(`http://localhost:${port}/api/as`, {
      validateStatus: function (status) {
        return status >= 200 && status < 600;
      }
    });
    const createA = require('../app/modules/api/api/createA/index');
    const afterIndex = require('../app/modules/authcopy/api/createA/[index]afterIndex');
    const createAGlobal = require('../app/modules/api/api/global/apiGlobal');
    const authApiGlobal = require('../app/modules/authcopy/api/global/apiAuthGlobal');
    expect(createA).toHaveBeenCalledTimes(1);
    expect(afterIndex).toHaveBeenCalledTimes(1);
    expect(createAGlobal).toHaveBeenCalledTimes(1);
    expect(authApiGlobal).toHaveBeenCalledTimes(1);
  });

  afterAll((done) => {
    close(server, done);
  });
});
