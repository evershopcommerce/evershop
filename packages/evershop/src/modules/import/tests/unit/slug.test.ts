import { describe, it, expect } from '@jest/globals';
import { slugify as coreSlugify } from '../../../../lib/util/slugify.js';
import { slugify } from '../../services/slug.js';

describe('slugify (a copy of lib/util/slugify.ts, D-24)', () => {
  it.each([
    ['Men Shoes', 'men-shoes'],
    ['Áo thun nam', 'ao-thun-nam'],
    ['Đồ chơi', 'do-choi'],
    ['  --Hello,   World!--  ', 'hello-world'],
    ['Café & Crème', 'cafe-creme'],
    ['A_B C', 'a-b-c'],
    ['2026 Sale', '2026-sale'],
    ['黑色星期五', ''],
    ['!!!', ''],
    ['', '']
  ])('turns %j into %j', (name, key) => {
    expect(slugify(name)).toBe(key);
  });

  it('gives what the core function gives, on random text', () => {
    const alphabet = [
      'a',
      'B',
      'z',
      '0',
      '9',
      ' ',
      '-',
      '_',
      '!',
      '.',
      'é',
      'Ä',
      'ñ',
      'đ',
      'Đ',
      'ợ',
      'ø',
      '日',
      '́',
      '\n',
      '&',
      'ß',
      'İ',
      'ı'
    ];
    let seed = 20261017;
    const next = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed;
    };
    for (let i = 0; i < 5000; i += 1) {
      let text = '';
      const length = next() % 30;
      for (let j = 0; j < length; j += 1) {
        text += alphabet[next() % alphabet.length];
      }
      if (slugify(text) !== coreSlugify(text)) {
        throw new Error(`Different on ${JSON.stringify(text)}`);
      }
    }
  });

  it('always gives a key that the url_key rule accepts, or nothing', () => {
    for (const name of ['Women', 'Women & Men', '日本 Shoes', 'a--b']) {
      const key = slugify(name);
      expect(key === '' || /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(key)).toBe(true);
    }
  });
});
