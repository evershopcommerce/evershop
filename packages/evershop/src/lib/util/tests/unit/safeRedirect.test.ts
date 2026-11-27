import { describe, it, expect } from '@jest/globals';
import { getSafeRedirectPath } from '../../safeRedirect.js';

/**
 * `?redirect=` after login: only a path on this site may come out, or the
 * login page becomes an open redirect (CWE-601).
 */
describe('getSafeRedirectPath', () => {
  it.each([
    ['/admin', '/admin'],
    ['/admin/orders/edit/abc', '/admin/orders/edit/abc'],
    ['/admin/products?page=2&limit=20', '/admin/products?page=2&limit=20'],
    ['/admin/orders#activities', '/admin/orders#activities'],
    ['/cart', '/cart']
  ])('accepts the site path %s', (value, expected) => {
    expect(getSafeRedirectPath(value)).toBe(expected);
  });

  it.each([
    ['another site, protocol-relative', '//evil.example'],
    ['a backslash browsers read as a slash', '/\\evil.example'],
    ['two backslashes', '\\\\evil.example'],
    ['a TAB browsers drop', '/\t/evil.example'],
    ['a newline browsers drop', '/\n/evil.example'],
    ['a carriage return browsers drop', '/\r/evil.example'],
    ['a NUL byte', '/admin\x00'],
    ['an absolute URL', 'https://evil.example/admin'],
    ['a javascript: URL', 'javascript:alert(1)'],
    ['a relative path', 'admin/orders'],
    ['an empty string', ''],
    ['an over-long value', `/admin/${'a'.repeat(2048)}`]
  ])('refuses %s', (_label, value) => {
    expect(getSafeRedirectPath(value)).toBeNull();
  });

  it.each([undefined, null, 42, ['/admin'], { path: '/admin' }])(
    'refuses the non-string %p (e.g. a repeated query parameter)',
    (value) => {
      expect(getSafeRedirectPath(value)).toBeNull();
    }
  );

  describe('with a prefix', () => {
    const prefix = { prefix: '/admin' };

    it('accepts the prefix itself and paths under it', () => {
      expect(getSafeRedirectPath('/admin', prefix)).toBe('/admin');
      expect(getSafeRedirectPath('/admin/', prefix)).toBe('/admin/');
      expect(getSafeRedirectPath('/admin/orders?x=1', prefix)).toBe(
        '/admin/orders?x=1'
      );
    });

    it('refuses paths outside it', () => {
      expect(getSafeRedirectPath('/', prefix)).toBeNull();
      expect(getSafeRedirectPath('/cart', prefix)).toBeNull();
      expect(getSafeRedirectPath('/administrator', prefix)).toBeNull();
    });

    it('checks the normalized path, so dot segments cannot leave it', () => {
      expect(getSafeRedirectPath('/admin/../cart', prefix)).toBeNull();
      expect(getSafeRedirectPath('/admin/%2e%2e/cart', prefix)).toBeNull();
      expect(getSafeRedirectPath('/admin/./orders', prefix)).toBe(
        '/admin/orders'
      );
    });
  });
});
