import { describe, it, expect, beforeAll, afterEach, afterAll } from '@jest/globals';
import { setSSRContext } from '../../../locale/activeDictionary.js';
import { buildUrl } from '../../buildUrl.js';
import { addRoute, empty } from '../../Router.js';

const resetCtx = () =>
  setSSRContext({ locale: '', defaultLocale: '', isAdmin: false }, {});

beforeAll(() => {
  empty();
  addRoute({ id: 'cart', path: '/cart', isAdmin: false, method: ['GET'] });
  addRoute({
    id: 'productView',
    path: '/product/:uuid',
    isAdmin: false,
    method: ['GET']
  });
  addRoute({ id: 'adminDashboard', path: '/admin', isAdmin: true, method: ['GET'] });
});

afterEach(resetCtx);
afterAll(() => {
  empty();
  resetCtx();
});

describe('buildUrl — locale prefix (spec §6.10)', () => {
  it('does not prefix when the locale context is empty (dormant pre-P6)', () => {
    resetCtx();
    expect(buildUrl('cart')).toBe('/cart');
  });

  it('does not prefix the default locale', () => {
    setSSRContext({ locale: 'en', defaultLocale: 'en', isAdmin: false }, {});
    expect(buildUrl('cart')).toBe('/cart');
  });

  it('prefixes a non-default storefront locale', () => {
    setSSRContext({ locale: 'fr', defaultLocale: 'en', isAdmin: false }, {});
    expect(buildUrl('cart')).toBe('/fr/cart');
    expect(buildUrl('productView', { uuid: 'abc' })).toBe('/fr/product/abc');
  });

  it('appends the query after the prefix', () => {
    setSSRContext({ locale: 'fr', defaultLocale: 'en', isAdmin: false }, {});
    expect(buildUrl('cart', {}, { a: '1' })).toBe('/fr/cart?a=1');
  });

  it('never prefixes an admin route, even under a non-default locale', () => {
    setSSRContext({ locale: 'fr', defaultLocale: 'en', isAdmin: false }, {});
    expect(buildUrl('adminDashboard')).toBe('/admin');
  });

  it('does not prefix when the context itself is admin', () => {
    setSSRContext({ locale: 'fr', defaultLocale: 'en', isAdmin: true }, {});
    expect(buildUrl('cart')).toBe('/cart');
  });
});
