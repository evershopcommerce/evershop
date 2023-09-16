/* eslint-disable no-undef, global-require */
const { resolve } = require('path');
const { getRouteFromPath } = require('../../getRouteFromPath');

describe('Test getRouteFromPath function', () => {
  it('Parse app level route', () => {
    expect(getRouteFromPath(resolve('/catalog/pages/global/title.js'))).toEqual(
      {
        region: 'pages',
        scope: 'app',
        routeId: null
      }
    );

    expect(getRouteFromPath(resolve('/cms/api/global/title.js'))).toEqual({
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
      routeId: 'admin'
    });

    expect(getRouteFromPath(resolve('/cms/api/admin/all/title.js'))).toEqual({
      region: 'api',
      scope: 'admin',
      routeId: 'admin'
    });
  });

  it('Parse frontStore level route', () => {
    expect(
      getRouteFromPath(resolve('/catalog/pages/frontStore/all/title.js'))
    ).toEqual({
      region: 'pages',
      scope: 'frontStore',
      routeId: 'frontStore'
    });

    expect(
      getRouteFromPath(resolve('/cms/api/frontStore/all/title.js'))
    ).toEqual({
      region: 'api',
      scope: 'frontStore',
      routeId: 'frontStore'
    });
  });

  it('Parse admin routed level route', () => {
    expect(
      getRouteFromPath(resolve('/catalog/pages/admin/product/title.js'))
    ).toEqual({
      region: 'pages',
      scope: 'admin',
      routeId: 'product'
    });

    expect(
      getRouteFromPath(resolve('/cms/api/admin/product/title.js'))
    ).toEqual({
      region: 'api',
      scope: 'admin',
      routeId: 'product'
    });
  });

  it('Parse frontStore routed level route', () => {
    expect(
      getRouteFromPath(resolve('/catalog/pages/frontStore/product/title.js'))
    ).toEqual({
      region: 'pages',
      scope: 'frontStore',
      routeId: 'product'
    });

    expect(
      getRouteFromPath(resolve('/cms/api/frontStore/product/title.js'))
    ).toEqual({
      region: 'api',
      scope: 'frontStore',
      routeId: 'product'
    });
  });

  it('Parse multi admin routed level route', () => {
    expect(
      getRouteFromPath(
        resolve('/catalog/pages/admin/product+category/title.js')
      )
    ).toEqual({
      region: 'pages',
      scope: 'admin',
      routeId: ['product', 'category']
    });

    expect(
      getRouteFromPath(resolve('/cms/api/admin/product+category/title.js'))
    ).toEqual({
      region: 'api',
      scope: 'admin',
      routeId: ['product', 'category']
    });
  });

  it('Parse multi frontStore routed level route', () => {
    expect(
      getRouteFromPath(
        resolve('/catalog/pages/frontStore/product+category/title.js')
      )
    ).toEqual({
      region: 'pages',
      scope: 'frontStore',
      routeId: ['product', 'category']
    });

    expect(
      getRouteFromPath(resolve('/cms/api/frontStore/product+category/title.js'))
    ).toEqual({
      region: 'api',
      scope: 'frontStore',
      routeId: ['product', 'category']
    });
  });

  it('Parse invalid path', () => {
    expect(() =>
      getRouteFromPath(
        resolve('/catalog/controllers/fro ntStore/product/title.js')
      )
    ).toThrow();

    expect(() =>
      getRouteFromPath(
        resolve('/catalog/controllers/frontStore/pro2uct/title.js')
      )
    ).toThrow();
  });
});
