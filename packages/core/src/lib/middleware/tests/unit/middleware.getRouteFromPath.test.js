const { resolve } = require('path');
const { getRouteFromPath } = require("../../getRouteFromPath");

describe('Test getRouteFromPath function', () => {
  it('Parse app level route', () => {
    expect(
      getRouteFromPath(resolve('/catalog/controllers/title.js'))
    ).toEqual({
      scope: 'app',
      routeId: null
    });

    expect(
      getRouteFromPath(resolve('/cms/apiControllers/title.js'))
    ).toEqual({
      scope: 'app',
      routeId: null
    });
  });

  it('Parse admin level route', () => {
    expect(
      getRouteFromPath(resolve('/catalog/controllers/admin/all/title.js'))
    ).toEqual({
      scope: 'admin',
      routeId: 'admin',
    });

    expect(
      getRouteFromPath(resolve('/cms/apiControllers/admin/all/title.js'))
    ).toEqual({
      scope: 'admin',
      routeId: 'admin',
    });
  });

  it('Parse site level route', () => {
    expect(
      getRouteFromPath(resolve('/catalog/controllers/site/all/title.js'))
    ).toEqual({
      scope: 'site',
      routeId: 'site',
    });

    expect(
      getRouteFromPath(resolve('/cms/apiControllers/site/all/title.js'))
    ).toEqual({
      scope: 'site',
      routeId: 'site',
    });
  });

  it('Parse admin routed level route', () => {
    expect(
      getRouteFromPath(resolve('/catalog/controllers/admin/product/title.js'))
    ).toEqual({
      scope: 'admin',
      routeId: 'product',
    });

    expect(
      getRouteFromPath(resolve('/cms/apiControllers/admin/product/title.js'))
    ).toEqual({
      scope: 'admin',
      routeId: 'product',
    });
  });

  it('Parse site routed level route', () => {
    expect(
      getRouteFromPath(resolve('/catalog/controllers/site/product/title.js'))
    ).toEqual({
      scope: 'site',
      routeId: 'product',
    });

    expect(
      getRouteFromPath(resolve('/cms/apiControllers/site/product/title.js'))
    ).toEqual({
      scope: 'site',
      routeId: 'product',
    });
  });

  it('Parse multi admin routed level route', () => {
    expect(
      getRouteFromPath(resolve('/catalog/controllers/admin/product+category/title.js'))
    ).toEqual({
      scope: 'admin',
      routeId: ['product', 'category'],
    });

    expect(
      getRouteFromPath(resolve('/cms/apiControllers/admin/product+category/title.js'))
    ).toEqual({
      scope: 'admin',
      routeId: ['product', 'category'],
    });
  });

  it('Parse multi site routed level route', () => {
    expect(
      getRouteFromPath(resolve('/catalog/controllers/site/product+category/title.js'))
    ).toEqual({
      scope: 'site',
      routeId: ['product', 'category'],
    });

    expect(
      getRouteFromPath(resolve('/cms/apiControllers/site/product+category/title.js'))
    ).toEqual({
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
