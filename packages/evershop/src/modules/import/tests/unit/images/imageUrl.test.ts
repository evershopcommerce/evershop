import { describe, it, expect } from '@jest/globals';
import { parseImageUrl } from '../../../services/images/imageUrl.js';
import { ImageError } from '../../../services/images/types.js';

describe('parseImageUrl (IMG-01)', () => {
  it.each([
    ['https://example.com/a.png'],
    ['http://example.com/a.png'],
    ['HTTPS://Example.com:8443/a/b.png?x=1#y'],
    ['https://192.0.2.1/a.png'],
    ['https://[2001:db8::1]/a.png']
  ])('accepts %s', (text) => {
    expect(parseImageUrl(text)).toBeInstanceOf(URL);
  });

  it.each([
    ['ftp://example.com/a.png'],
    ['file:///etc/passwd'],
    ['javascript:alert(1)'],
    ['data:image/png;base64,AAAA'],
    ['//example.com/a.png'],
    ['/a.png'],
    ['example.com/a.png'],
    ['https://user@example.com/a.png'],
    ['https://user:pw@example.com/a.png'],
    ['https://'],
    ['not a url'],
    ['']
  ])('refuses %j with invalid_url', (text) => {
    expect(() => parseImageUrl(text)).toThrow(ImageError);
    try {
      parseImageUrl(text);
    } catch (e) {
      expect((e as ImageError).reason).toBe('invalid_url');
    }
  });
});
