import { slugify, slugifyWithFallback } from '../../slugify.js';

/** The pattern `landing_page.url_key` accepts (landingPageDataSchema.json). */
const URL_KEY = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const UUID = '2f7c1e4a-5b6d-4c8e-9f0a-1b2c3d4e5f60';

describe('slugify', () => {
  test.each([
    ['Black Friday', 'black-friday'],
    ['  Mùa Hè  2026!! ', 'mua-he-2026'],
    ['Crème brûlée', 'creme-brulee'],
    ['Bánh sinh nhật', 'banh-sinh-nhat'],
    ['ĐỎ đen', 'do-den'],
    ['Đặc biệt — Sale 50%', 'dac-biet-sale-50'],
    ['Sale // 2026', 'sale-2026'],
    ['---Trimmed---', 'trimmed']
  ])('%s → %s', (input, expected) => {
    expect(slugify(input)).toBe(expected);
    expect(URL_KEY.test(slugify(input))).toBe(true);
  });

  test('a name with no Latin characters slugifies to empty', () => {
    expect(slugify('黑色星期五')).toBe('');
    expect(slugify('!!!')).toBe('');
  });
});

describe('slugifyWithFallback', () => {
  test('falls back to a uuid-derived key, which still matches the pattern', () => {
    const key = slugifyWithFallback('黑色星期五', UUID);
    expect(key).toBe('landing-page-2f7c1e4a');
    expect(URL_KEY.test(key)).toBe(true);
  });

  test('uses the slug when there is one', () => {
    expect(slugifyWithFallback('Black Friday', UUID)).toBe('black-friday');
  });
});
