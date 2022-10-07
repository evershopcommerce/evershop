const { resolve } = require('path');
const { getRouteFromPath } = require("../../getRouteFromPath");

describe('Test getRouteFromPath function', () => {
  it('Parse app level route', () => {
    expect(
      getRouteFromPath(resolve('/catalog/pages/global/title.js'))
    ).toEqual({
      region: 'pages',
      scope: 'app',
      routeId: null
    });

    expect(
      getRouteFromPath(resolve('/cms/api/global/title.js'))
    ).toEqual({
      region: 'api',
      scope: 'app',
      routeId: null
    });
  });

  it('Parse admin level route', () => {
    expect(
      getRouteFromPath(resolve('/catalog/pages/admin/all/title.js'))
    ).toEqual({
      region: 'pages',
      scope: 'admin',
      routeId: 'admin',
    });

    expect(
      getRouteFromPath(resolve('/cms/api/admin/all/title.js'))
    ).toEqual({
      region: 'api',
      scope: 'admin',
      routeId: 'admin',
    });
  });

  it('Parse site level route', () => {
    expect(
      getRouteFromPath(resolve('/catalog/pages/site/all/title.js'))
    ).toEqual({
      region: 'pages',
      scope: 'site',
      routeId: 'site',
    });

    expect(
      getRouteFromPath(resolve('/cms/api/site/all/title.js'))
    ).toEqual({
      region: 'api',
      scope: 'site',
      routeId: 'site',
    });
  });

  it('Parse admin routed level route', () => {
    expect(
      getRouteFromPath(resolve('/catalog/pages/admin/product/title.js'))
    ).toEqual({
      region: 'pages',
      scope: 'admin',
      routeId: 'product',
    });

    expect(
      getRouteFromPath(resolve('/cms/api/admin/product/title.js'))
    ).toEqual({
      region: 'api',
      scope: 'admin',
      routeId: 'product',
    });
  });

  it('Parse site routed level route', () => {
    expect(
      getRouteFromPath(resolve('/catalog/pages/site/product/title.js'))
    ).toEqual({
      region: 'pages',
      scope: 'site',
      routeId: 'product',
    });

    expect(
      getRouteFromPath(resolve('/cms/api/site/product/title.js'))
    ).toEqual({
      region: 'api',
      scope: 'site',
      routeId: 'product',
    });
  });

  it('Parse multi admin routed level route', () => {
    expect(
      getRouteFromPath(resolve('/catalog/pages/admin/product+category/title.js'))
    ).toEqual({
      region: 'pages',
      scope: 'admin',
      routeId: ['product', 'category'],
    });

    expect(
      getRouteFromPath(resolve('/cms/api/admin/product+category/title.js'))
    ).toEqual({
      region: 'api',
      scope: 'admin',
      routeId: ['product', 'category'],
    });
  });

  it('Parse multi site routed level route', () => {
    expect(
      getRouteFromPath(resolve('/catalog/pages/site/product+category/title.js'))
    ).toEqual({
      region: 'pages',
      scope: 'site',
      routeId: ['product', 'category'],
    });

    expect(
      getRouteFromPath(resolve('/cms/api/site/product+category/title.js'))
    ).toEqual({
      region: 'api',
      scope: 'site',
      routeId: ['product', 'category'],
    });
  });

  it('Parse invalid path', () => {
    expect(
      () => getRouteFromPath(resolve('/catalog/controllers/s ite/product/title.js'))
    ).toThrow();

    expect(
      () => getRouteFromPath(resolve('/catalog/controllers/site/pro2uct/title.js'))
    ).toThrow();
  });
});
