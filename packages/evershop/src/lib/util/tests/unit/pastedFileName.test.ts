import { describe, expect, it } from '@jest/globals';
import {
  baseNameFromUrl,
  clipboardStamp,
  pastedFileName
} from '../../pastedFileName.js';

const STAMP = '20260930142233';

describe('pastedFileName', () => {
  it('names a pasted image after the clipboard, not "image.png"', () => {
    expect(pastedFileName('image.png', 'image/png', STAMP)).toBe(
      'pasted-20260930142233.png'
    );
  });

  it('gives every file in one paste a distinct name', () => {
    // `generateFileName` sanitises but does not de-duplicate, so two files
    // called image.png would overwrite each other on the way in.
    const names = ['image.png', 'image.png', 'image.png'].map((n, i) =>
      pastedFileName(n, 'image/png', STAMP, i)
    );
    expect(new Set(names).size).toBe(3);
    expect(names[0]).toBe('pasted-20260930142233-1.png');
  });

  it('keeps a real filename, which carries information we were given', () => {
    expect(pastedFileName('quarterly-report.pdf', 'application/pdf', STAMP)).toBe(
      'quarterly-report.pdf'
    );
    // "image" as a real name, not the generic placeholder pattern.
    expect(pastedFileName('image-of-a-cake.png', 'image/png', STAMP)).toBe(
      'image-of-a-cake.png'
    );
  });

  it('takes the extension from the media type when the name has none', () => {
    expect(pastedFileName('', 'image/webp', STAMP)).toBe(
      'pasted-20260930142233.webp'
    );
    expect(pastedFileName('', 'image/jpeg', STAMP)).toBe(
      'pasted-20260930142233.jpg'
    );
  });

  it('falls back to the name\'s own extension for an unknown type', () => {
    expect(pastedFileName('image.heic', 'image/heic', STAMP)).toBe(
      'pasted-20260930142233.heic'
    );
  });

  it('produces no extension when neither source has one', () => {
    // Better than inventing one: the server decides what it will accept.
    expect(pastedFileName('', undefined, STAMP)).toBe('pasted-20260930142233');
  });
});

describe('clipboardStamp', () => {
  it('is sortable and safe in a filename', () => {
    const stamp = clipboardStamp(new Date('2026-09-30T14:22:33.000Z'));
    expect(stamp).toBe('20260930142233');
    expect(stamp).toMatch(/^[0-9]{14}$/);
  });
});

describe('baseNameFromUrl', () => {
  it('takes the name the site gave the file', () => {
    expect(baseNameFromUrl('https://site.com/img/chocolate-cake.jpg')).toBe(
      'chocolate-cake'
    );
  });

  it('ignores the query string and fragment', () => {
    expect(
      baseNameFromUrl('https://cdn.site.com/a/hero-banner.webp?w=800&q=70')
    ).toBe('hero-banner');
  });

  it('decodes percent-encoding', () => {
    expect(baseNameFromUrl('https://site.com/my%20cake%20photo.png')).toBe(
      'my cake photo'
    );
  });

  it('handles a path with no extension', () => {
    expect(baseNameFromUrl('https://site.com/images/12345')).toBe('12345');
  });

  it('gives up where there is nothing to use', () => {
    // The timestamp name takes over for all of these.
    expect(baseNameFromUrl('data:image/png;base64,iVBORw0KGgo=')).toBe('');
    // A trailing slash is a directory, not a file — returning "img" here
    // would name every paste from that site the same thing.
    expect(baseNameFromUrl('https://site.com/img/')).toBe('');
    expect(baseNameFromUrl('https://site.com')).toBe('');
    expect(baseNameFromUrl('https://site.com/___.png')).toBe('');
    expect(baseNameFromUrl(undefined)).toBe('');
  });

  it('works with a relative src from the copied markup', () => {
    expect(baseNameFromUrl('/assets/catalog/sponge-cake.jpg')).toBe(
      'sponge-cake'
    );
  });

  it('caps a name that would dominate the listing', () => {
    const long = `https://site.com/${'a'.repeat(200)}.png`;
    expect(baseNameFromUrl(long).length).toBe(60);
  });
});

describe('pastedFileName with a source URL', () => {
  it('prefers the site\'s name over a timestamp', () => {
    expect(
      pastedFileName(
        'image.png',
        'image/png',
        STAMP,
        undefined,
        'https://site.com/img/chocolate-cake.jpg'
      )
    ).toBe('chocolate-cake.png');
  });

  it('takes the extension from the DATA, not the URL', () => {
    // A browser re-encodes a copied image: a JPEG on the page arrives as PNG
    // bytes. Trusting the URL's ".jpg" would mislabel the file.
    expect(
      pastedFileName(
        'image.png',
        'image/png',
        STAMP,
        undefined,
        'https://site.com/photo.jpg'
      )
    ).toBe('photo.png');
  });

  it('still separates a batch copied from one page', () => {
    const names = [0, 1].map((i) =>
      pastedFileName('image.png', 'image/png', STAMP, i, 'https://s.com/a.png')
    );
    expect(names).toEqual(['a-1.png', 'a-2.png']);
    expect(new Set(names).size).toBe(2);
  });

  it('falls back to the timestamp when the URL yields nothing', () => {
    expect(
      pastedFileName('image.png', 'image/png', STAMP, undefined, 'data:image/png;base64,AA')
    ).toBe('pasted-20260930142233.png');
  });

  it('never overrides a real filename', () => {
    // A file pasted from the file manager already has the name its owner gave
    // it; a URL hint must not replace that.
    expect(
      pastedFileName(
        'holiday-cake.jpg',
        'image/jpeg',
        STAMP,
        undefined,
        'https://site.com/other.png'
      )
    ).toBe('holiday-cake.jpg');
  });
});
