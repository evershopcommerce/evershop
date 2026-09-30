import { describe, expect, it } from '@jest/globals';

/**
 * The file browser shows and copies an ABSOLUTE url, but the providers do not
 * agree on what they return: only local storage returns a relative path. This
 * pins the join the admin performs, because getting it wrong is silent — the
 * URL still looks plausible, it just does not serve the file.
 */
const resolve = (url: string, baseUrl?: string, adminOrigin = 'http://admin.internal:3000') => {
  try {
    return new URL(url, baseUrl || adminOrigin).href;
  } catch {
    return url;
  }
};

describe('file URL resolution', () => {
  it('prepends the store base URL to a LOCAL relative path', () => {
    expect(resolve('/assets/catalog/a.png', 'https://shop.example.com')).toBe(
      'https://shop.example.com/assets/catalog/a.png'
    );
  });

  it('leaves an ALREADY-ABSOLUTE cloud URL untouched', () => {
    // One code path has to be right for every provider: S3, Azure and GCS all
    // return absolute URLs, so the base must be ignored for them.
    for (const url of [
      'https://my-bucket.s3.eu-west-1.amazonaws.com/catalog/a.png',
      'https://acct.blob.core.windows.net/images/catalog/a.png',
      'https://storage.googleapis.com/my-bucket/catalog/a.png',
      'https://cdn.example.com/catalog/a.png'
    ]) {
      expect(resolve(url, 'https://shop.example.com')).toBe(url);
    }
  });

  it('uses the store base URL, NOT the origin the admin is open on', () => {
    // The admin can be reached by IP or through a proxy while the storefront
    // answers on its own domain. Resolving against the admin origin produces
    // a URL that looks right and does not serve the file.
    expect(resolve('/assets/a.png', 'https://shop.example.com', 'http://10.0.0.4:3000')).toBe(
      'https://shop.example.com/assets/a.png'
    );
  });

  it('falls back to the admin origin when the response carries no base URL', () => {
    // An older server, or a third-party consumer of the API.
    expect(resolve('/assets/a.png', undefined, 'https://admin.example.com')).toBe(
      'https://admin.example.com/assets/a.png'
    );
  });

  it('survives a base URL with a trailing slash and a path', () => {
    expect(resolve('/assets/a.png', 'https://shop.example.com/')).toBe(
      'https://shop.example.com/assets/a.png'
    );
    // A store mounted under a sub-path: a root-relative file path is still
    // root-relative, which is what `buildUrl` produced.
    expect(resolve('/assets/a.png', 'https://example.com/shop')).toBe(
      'https://example.com/assets/a.png'
    );
  });
});
