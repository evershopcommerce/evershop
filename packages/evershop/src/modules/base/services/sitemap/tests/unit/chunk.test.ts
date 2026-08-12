import { chunk } from '../../chunk.js';
import { SitemapUrlRecord } from '../../types.js';

const records = (n: number): SitemapUrlRecord[] =>
  Array.from({ length: n }, (_, i) => ({ loc: `https://shop.com/p${i}` }));

describe('chunk', () => {
  it('returns no chunks for empty input', () => {
    expect(chunk([], 50000, 'products')).toEqual([]);
  });

  it('returns a single named chunk under the limit', () => {
    const out = chunk(records(1), 50000, 'products');
    expect(out).toHaveLength(1);
    expect(out[0].name).toBe('products');
    expect(out[0].records).toHaveLength(1);
  });

  it('keeps one chunk exactly at the limit', () => {
    const out = chunk(records(50000), 50000, 'products');
    expect(out).toHaveLength(1);
    expect(out[0].name).toBe('products');
    expect(out[0].records).toHaveLength(50000);
  });

  it('splits into overflow chunks past the limit with -N names', () => {
    const out = chunk(records(50001), 50000, 'products');
    expect(out).toHaveLength(2);
    expect(out[0].name).toBe('products');
    expect(out[0].records).toHaveLength(50000);
    expect(out[1].name).toBe('products-2');
    expect(out[1].records).toHaveLength(1);
  });

  it('names successive overflow chunks -2, -3, …', () => {
    const out = chunk(records(7), 3, 'products');
    expect(out.map((c) => c.name)).toEqual([
      'products',
      'products-2',
      'products-3'
    ]);
    expect(out.map((c) => c.records.length)).toEqual([3, 3, 1]);
  });
});
