/* eslint-disable no-undef, global-require */
const { Handler } = require('../../Handler');
require('../app/app');

describe('test getMiddlewaresByRoute', () => {
  const productMiddleweres = Handler.getMiddlewareByRoute({
    id: 'product',
    isAdmin: false
  });
  it('should contains middlewares for product route', () => {
    expect(
      productMiddleweres.findIndex((m) => m.id === 'loadCategory')
    ).not.toBe(-1);
    expect(
      productMiddleweres.findIndex((m) => m.id === 'loadProductImage')
    ).not.toBe(-1);
  });

  it('should contains frontStore level middleware', () => {
    expect(productMiddleweres.findIndex((m) => m.id === 'title')).not.toBe(-1);
  });

  it('should contains application level middleware', () => {
    expect(productMiddleweres.findIndex((m) => m.id === 'auth')).not.toBe(-1);
    expect(
      productMiddleweres.findIndex((m) => m.id === 'errorHandler')
    ).not.toBe(-1);
    expect(productMiddleweres.findIndex((m) => m.id === 'context')).not.toBe(
      -1
    );
    expect(productMiddleweres.findIndex((m) => m.id === 'response')).not.toBe(
      -1
    );
  });

  const productEditMiddleweres = Handler.getMiddlewareByRoute({
    id: 'productEdit',
    isAdmin: true
  });

  it('should contains middlewares for product route', () => {
    expect(
      productEditMiddleweres.findIndex((m) => m.id === 'loadCategory')
    ).not.toBe(-1);
    expect(
      productEditMiddleweres.findIndex((m) => m.id === 'loadProductImage')
    ).not.toBe(-1);
  });

  it('should contains admin level middleware', () => {
    expect(
      productEditMiddleweres.findIndex((m) => m.id === 'adminTitle')
    ).not.toBe(-1);
  });

  it('should contains application level middleware', () => {
    expect(productEditMiddleweres.findIndex((m) => m.id === 'auth')).not.toBe(
      -1
    );
    expect(
      productEditMiddleweres.findIndex((m) => m.id === 'errorHandler')
    ).not.toBe(-1);
    expect(
      productEditMiddleweres.findIndex((m) => m.id === 'context')
    ).not.toBe(-1);
    expect(
      productEditMiddleweres.findIndex((m) => m.id === 'response')
    ).not.toBe(-1);
  });
});
