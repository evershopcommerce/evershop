/* eslint-disable no-undef, global-require */
const path = require('path');
const { scanForRoutes } = require('../../scanForRoutes');
const { registerAdminRoute } = require('../../registerAdminRoute');
const { validateRoute } = require('../../validateRoute');

describe('Test validateRoute', () => {
  beforeAll(() => {
    const routes = scanForRoutes(path.resolve(__dirname, 'b'), true, false);
    routes.forEach((route) => {
      registerAdminRoute(
        route.id,
        route.method,
        route.path,
        route.name,
        route.isApi
      );
    });
  });

  it('It should thrown an exception if route is already existed', () => {
    expect(() => validateRoute('routeOne', ['GET'], '/')).toThrow(Error);
  });

  it('It should return a route object if id is valid', () => {
    const route = validateRoute('newRoute', ['GET'], '/');
    expect(route.id).toBeTruthy();
    expect(route.method).toBeTruthy();
    expect(route.path).toBeTruthy();
  });
});
