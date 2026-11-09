import { describe, it, expect } from '@jest/globals';
import {
  checkImageType,
  extensionForImageType,
  normalizeContentType
} from '../../../services/images/imageTypes.js';
import { ImageError } from '../../../services/images/types.js';

const DEFAULT_ALLOWED = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/avif',
  'image/apng'
];

describe('normalizeContentType', () => {
  it.each([
    ['image/png', 'image/png'],
    ['IMAGE/PNG', 'image/png'],
    ['image/png; charset=binary', 'image/png'],
    ['  image/jpeg ;q=1', 'image/jpeg'],
    ['image/svg+xml', 'image/svg+xml'],
    ['image/vnd.microsoft.icon', 'image/vnd.microsoft.icon']
  ])('reads %j as %s', (header, expected) => {
    expect(normalizeContentType(header)).toBe(expected);
  });

  it.each([
    [null],
    [undefined],
    [''],
    ['image'],
    ['image/'],
    ['/png'],
    ['a b/c'],
    [';charset=x']
  ])('gives null for %j', (header) => {
    expect(
      normalizeContentType(header as string | null | undefined)
    ).toBeNull();
  });
});

describe('extensionForImageType (IMG-07)', () => {
  it.each([
    ['image/jpeg', '.jpg'],
    ['image/png', '.png'],
    ['image/gif', '.gif'],
    ['image/webp', '.webp'],
    ['image/avif', '.avif'],
    ['image/apng', '.apng']
  ])('%s is %s', (type, extension) => {
    expect(extensionForImageType(type)).toBe(extension);
  });

  it.each([['image/svg+xml'], ['image/x-unknown'], ['text/html'], ['']])(
    'has none for %j',
    (type) => {
      expect(extensionForImageType(type)).toBeNull();
    }
  );

  it('does not take a name that is a property of every object for a type', () => {
    expect(extensionForImageType('constructor')).toBeNull();
    expect(extensionForImageType('__proto__')).toBeNull();
    expect(extensionForImageType('toString')).toBeNull();
  });
});

describe('checkImageType (IMG-04)', () => {
  it.each(DEFAULT_ALLOWED)('accepts %s', (type) => {
    expect(checkImageType(type, DEFAULT_ALLOWED)).toBeNull();
  });

  it.each([
    [null],
    ['text/html'],
    ['application/json'],
    ['video/mp4'],
    ['application/octet-stream']
  ])('says not_an_image for %j', (type) => {
    const problem = checkImageType(type, DEFAULT_ALLOWED);
    expect(problem).toBeInstanceOf(ImageError);
    expect(problem?.reason).toBe('not_an_image');
    expect(problem?.params).toEqual({ contentType: type });
  });

  it('refuses an image type the store does not accept', () => {
    const problem = checkImageType('image/bmp', DEFAULT_ALLOWED);
    expect(problem?.reason).toBe('type_not_allowed');
    expect(problem?.params).toEqual({ contentType: 'image/bmp' });
  });

  it('accepts an extra type the store was given', () => {
    expect(
      checkImageType('image/bmp', [...DEFAULT_ALLOWED, 'image/bmp'])
    ).toBeNull();
  });

  it('refuses SVG even when the store accepts it: it can carry scripts', () => {
    const allowed = [...DEFAULT_ALLOWED, 'image/svg+xml', 'image/svg'];
    expect(checkImageType('image/svg+xml', allowed)?.reason).toBe(
      'type_not_allowed'
    );
    expect(checkImageType('image/svg', allowed)?.reason).toBe(
      'type_not_allowed'
    );
  });

  it('refuses an accepted image type that has no extension to name the file with', () => {
    expect(
      checkImageType('image/x-unknown', [...DEFAULT_ALLOWED, 'image/x-unknown'])
        ?.reason
    ).toBe('type_not_allowed');
  });
});
