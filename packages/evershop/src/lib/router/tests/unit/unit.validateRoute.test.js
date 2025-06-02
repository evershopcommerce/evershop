import path from 'path';
import { scanForRoutes } from '../../scanForRoutes.js';
import { registerAdminRoute } from '../../registerAdminRoute.js';
import { validateRoute } from '../../validateRoute.js';
import { jest, describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
