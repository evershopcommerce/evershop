import { readdirSync, readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import { getAssetUrl } from '../../getAssetUrl.js';
import { getImageUrl } from '../../getImageUrl.js';

/**
 * getAssetUrl (a stored file's absolute URL) and getImageUrl (an absolute URL
 * of a resized copy through `/images`): the two helpers that replace the
 * hand-built asset and image URLs in emails and social sharing tags. A stored
 * file is a site-relative path with local storage, or a full URL with any
 * other storage (S3, Azure Blob, Google Cloud Storage, Cloudinary, a CDN).
 */
const BASE = 'https://shop.example.com';
const originalHome = process.env.EVERSHOP_HOME_URL;
beforeEach(() => {
  process.env.EVERSHOP_HOME_URL = BASE;
});
afterAll(() => {
  if (originalHome === undefined) {
    delete process.env.EVERSHOP_HOME_URL;
  } else {
    process.env.EVERSHOP_HOME_URL = originalHome;
  }
});

const S3 =
  'https://evershop-stage0-site-54da42ce.s3.ap-southeast-1.amazonaws.com/catalog/9424/1250/thermos-black.jpg';
const CLOUD_URLS = [
  S3,
  'https://myshop.blob.core.windows.net/media/catalog/tee.jpg',
  'https://storage.googleapis.com/my-bucket/catalog/tee.jpg',
  'https://res.cloudinary.com/demo/image/upload/v1/catalog/tee.jpg',
  'http://cdn.example.com/x.jpg',
  'HTTP://cdn.example.com/x.jpg',
  'data:image/png;base64,iVBORw0KGgo='
];

describe('getAssetUrl', () => {
  it('puts the base URL in front of a local-storage path', () => {
    expect(getAssetUrl('/assets/catalog/9424/1250/thermos.jpg')).toBe(
      `${BASE}/assets/catalog/9424/1250/thermos.jpg`
    );
  });

  it('adds the slash a path without one needs', () => {
    expect(getAssetUrl('assets/logo.png')).toBe(`${BASE}/assets/logo.png`);
  });

  it('keeps a sub-path base URL, without its trailing slash', () => {
    process.env.EVERSHOP_HOME_URL = 'https://shop.example.com/store/';
    expect(getAssetUrl('/assets/favicon.ico')).toBe(
      'https://shop.example.com/store/assets/favicon.ico'
    );
  });

  it.each(CLOUD_URLS)('returns a full URL from any storage as it is: %s', (url) => {
    expect(getAssetUrl(url)).toBe(url);
  });

  it('an empty value stays empty', () => {
    expect(getAssetUrl('')).toBe('');
  });

  it('a protocol-relative URL gets the scheme of the base URL', () => {
    expect(getAssetUrl('//cdn.example.com/x.jpg')).toBe(
      'https://cdn.example.com/x.jpg'
    );
    process.env.EVERSHOP_HOME_URL = 'http://localhost:3000';
    expect(getAssetUrl('//cdn.example.com/x.jpg')).toBe(
      'http://cdn.example.com/x.jpg'
    );
  });

  it.each([
    'javascript:alert(1)',
    'JavaScript:alert(1)',
    ' javascript:alert(1)',
    'java\tscript:alert(1)',
    'vbscript:msgbox(1)',
    'file://attacker/share/a.png'
  ])('a value that is not a file URL becomes empty: %j', (value) => {
    expect(getAssetUrl(value)).toBe('');
  });

  it('a colon or a double slash inside a local path is not a scheme', () => {
    expect(getAssetUrl('/assets//file.jpg')).toBe(`${BASE}/assets//file.jpg`);
    expect(getAssetUrl('/assets/catalog/a:b.jpg')).toBe(
      `${BASE}/assets/catalog/a:b.jpg`
    );
  });

  it('is what the order email and the blog post wrote by hand, for their values', () => {
    // sendOrderConfirmationEmail: /^https?:\/\//i ? value : base + value
    // blogPostView: value.startsWith('http') ? value : base + value
    for (const value of ['/assets/catalog/a.jpg', S3]) {
      const byHand = /^https?:\/\//i.test(value) ? value : `${BASE}${value}`;
      expect(getAssetUrl(value)).toBe(byHand);
    }
  });
});

describe('getImageUrl', () => {
  it('builds the /images URL, absolute, with the stored value as src', () => {
    expect(
      getImageUrl('/assets/catalog/tee.jpg', {
        width: 1200,
        quality: 80,
        height: 675,
        format: 'png'
      })
    ).toBe(
      `${BASE}/images?src=%2Fassets%2Fcatalog%2Ftee.jpg&w=1200&q=80&h=675&f=png`
    );
  });

  it('encodes a cloud URL as src, query string, spaces and accents included', () => {
    const src = 'https://res.cloudinary.com/demo/áo thun.jpg?v=1&x=2';
    expect(getImageUrl(src, { width: 100 })).toBe(
      `${BASE}/images?src=${encodeURIComponent(src)}&w=100`
    );
  });

  it('leaves out what is not given (the endpoint has defaults)', () => {
    expect(getImageUrl('/a.jpg', { width: 300, format: 'webp' })).toBe(
      `${BASE}/images?src=%2Fa.jpg&w=300&f=webp`
    );
  });

  it('leaves out a null option too (h=null would be refused by the endpoint)', () => {
    expect(
      getImageUrl('/a.jpg', {
        width: 300,
        height: null,
        quality: null,
        format: null
      } as never)
    ).toBe(`${BASE}/images?src=%2Fa.jpg&w=300`);
  });

  it('keeps one order whatever the order of the options', () => {
    expect(
      getImageUrl('/a.jpg', { format: 'png', height: 2, quality: 3, width: 1 })
    ).toBe(`${BASE}/images?src=%2Fa.jpg&w=1&q=3&h=2&f=png`);
  });

  it('is byte for byte what the social tags and the email logo wrote by hand', () => {
    const src = S3;
    const enc = encodeURIComponent(src);
    // productView, categoryView and the PageInfo logo fallback
    expect(
      getImageUrl(src, { width: 1200, quality: 80, height: 675, format: 'png' })
    ).toBe(`${BASE}/images?src=${enc}&w=1200&q=80&h=675&f=png`);
    // PageInfo social sharing image
    expect(getImageUrl(src, { width: 1200, quality: 80, format: 'jpeg' })).toBe(
      `${BASE}/images?src=${enc}&w=1200&q=80&f=jpeg`
    );
    // The email logo with its known size
    expect(getImageUrl(src, { width: 480, quality: 85, format: 'png' })).toBe(
      `${BASE}/images?src=${enc}&w=480&q=85&f=png`
    );
  });
});

describe('no server code builds an /images URL by hand', () => {
  // The package's src folder (this test runs from dist/lib/util/tests/unit)
  const SRC = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../../../../../src'
  );
  // `/images?src=${…}`, or '/images?src=' + … with any quote
  const HAND_BUILT = /\/images\?src=(\$\{|['"`]\s*\+)/;

  function serverFiles(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        // React components also render in the browser, where a relative
        // `/images?src=` is right and the server helpers cannot go
        return ['components', 'tests', 'node_modules'].includes(entry.name)
          ? []
          : serverFiles(full);
      }
      return /\.(ts|js)$/.test(entry.name) && !entry.name.endsWith('.d.ts')
        ? [full]
        : [];
    });
  }

  it('the pattern catches each way of writing it', () => {
    for (const code of [
      'const u = `${base}/images?src=${enc}&w=1`;',
      "const u = base + '/images?src=' + enc;",
      'const u = base + "/images?src=" + enc;',
      'const u = base + `/images?src=` + enc;'
    ]) {
      expect(HAND_BUILT.test(code)).toBe(true);
    }
    // A comment that mentions the endpoint is not code
    expect(HAND_BUILT.test(' * the image proxy (`/images?src=…`)')).toBe(false);
  });

  it('only getImageUrl does', () => {
    const files = serverFiles(SRC);
    // Positive control: the scan reached the real source tree, the files that
    // built the URL by hand included
    for (const file of [
      'lib/util/getImageUrl.ts',
      'lib/mail/emailHelper.ts',
      'modules/catalog/pages/frontStore/productView/index.ts',
      'modules/catalog/pages/frontStore/categoryView/index.ts',
      'modules/cms/graphql/types/PageInfo/PageInfo.resolvers.ts'
    ]) {
      expect(files).toContain(path.join(SRC, file));
    }
    expect(files.length).toBeGreaterThan(500);
    const offenders = files
      .filter((file) => HAND_BUILT.test(readFileSync(file, 'utf8')))
      .map((file) => path.relative(SRC, file));
    expect(offenders).toEqual([]);
  });
});
