import { describe, it, expect } from '@jest/globals';
import { isOwnStorageUrl } from '../../../services/images/ownStorage.js';

const BASES = [
  'https://shop.example.com/assets/',
  'https://bucket.s3.eu-west-1.amazonaws.com/media'
];

describe('isOwnStorageUrl (IMG-06)', () => {
  it.each([
    ['https://shop.example.com/assets/catalog/ab/cd/tee.png'],
    ['https://shop.example.com/assets/tee.png'],
    ['https://SHOP.EXAMPLE.COM/assets/tee.png'],
    ['https://shop.example.com:443/assets/tee.png'],
    ['https://bucket.s3.eu-west-1.amazonaws.com/media/catalog/tee.png'],
    ['https://bucket.s3.eu-west-1.amazonaws.com/media']
  ])('says yes for %s', (url) => {
    expect(isOwnStorageUrl(url, BASES)).toBe(true);
  });

  it.each([
    ['https://shop.example.com.evil.test/assets/tee.png'],
    ['https://evil.test/https://shop.example.com/assets/tee.png'],
    ['https://shop.example.com/assetsevil/tee.png'],
    ['https://shop.example.com/assets/../admin/secret.png'],
    ['https://shop.example.com/assets/%2e%2e/admin/secret.png'],
    ['https://shop.example.com/other/tee.png'],
    ['http://shop.example.com/assets/tee.png'],
    ['https://shop.example.com:8443/assets/tee.png'],
    ['https://user:pw@shop.example.com/assets/tee.png'],
    ['https://bucket.s3.eu-west-1.amazonaws.com/mediaevil/tee.png'],
    ['https://cdn.example.com/tee.png'],
    ['ftp://shop.example.com/assets/tee.png'],
    ['not a url'],
    ['']
  ])('says no for %s', (url) => {
    expect(isOwnStorageUrl(url, BASES)).toBe(false);
  });

  it('says no when there is no storage address, or the address is broken', () => {
    expect(isOwnStorageUrl('https://shop.example.com/assets/a.png', [])).toBe(
      false
    );
    expect(
      isOwnStorageUrl('https://shop.example.com/assets/a.png', ['not a url'])
    ).toBe(false);
  });
});
