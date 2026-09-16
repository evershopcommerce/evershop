import {
  applySortToUrl,
  implicitSortOrder
} from '../../ProductSorting.js';

/**
 * The storefront never sends the sort direction when it matches what the server
 * would do anyway, so these tests encode what the server actually does:
 *
 *   no `ob`  -> ProductCollection's constructor order, `product.product_id DESC`
 *   any `ob` -> SelectQuery.orderBy(field), whose direction defaults to ASC
 *
 * Two bugs this locks down:
 *  - `od=asc` was never emitted (compared against a constant 'asc'), so on the
 *    default sort both toggle states resolved to DESC — the arrow flipped and
 *    nothing moved.
 *  - sorting kept `page`, leaving you on page N of a freshly reshuffled list.
 */
const BASE = 'https://shop.test/women-shoes';

describe('implicitSortOrder', () => {
  it('is desc with no sort column, because the collection keeps product_id DESC', () => {
    expect(implicitSortOrder('')).toBe('desc');
  });

  it('is asc for any sort column, because SelectQuery.orderBy defaults to ASC', () => {
    expect(implicitSortOrder('price')).toBe('asc');
    expect(implicitSortOrder('name')).toBe('asc');
  });
});

describe('applySortToUrl', () => {
  const sorted = (url: string, sortBy: string, sortOrder: 'asc' | 'desc') =>
    applySortToUrl(url, { sortBy, sortOrder });

  describe('default sort (no ob) — the direction toggle must actually toggle', () => {
    it('emits od=asc, since the implicit direction is desc', () => {
      const url = sorted(BASE, '', 'asc');
      expect(url.searchParams.get('ob')).toBeNull();
      expect(url.searchParams.get('od')).toBe('asc');
    });

    it('drops od when going back to desc, which is already the implicit order', () => {
      const url = sorted(`${BASE}?od=asc`, '', 'desc');
      expect(url.searchParams.get('od')).toBeNull();
    });

    it('round-trips: asc and desc produce different URLs', () => {
      expect(sorted(BASE, '', 'asc').search).not.toEqual(
        sorted(BASE, '', 'desc').search
      );
    });
  });

  describe('explicit column', () => {
    it('drops od for asc, which is what orderBy() already does', () => {
      const url = sorted(BASE, 'price', 'asc');
      expect(url.searchParams.get('ob')).toBe('price');
      expect(url.searchParams.get('od')).toBeNull();
    });

    it('emits od=desc to override the ASC default', () => {
      const url = sorted(BASE, 'price', 'desc');
      expect(url.searchParams.get('ob')).toBe('price');
      expect(url.searchParams.get('od')).toBe('desc');
    });

    it('clears a stale od when switching column changes the implicit direction', () => {
      // ?od=asc was meaningful under the default sort; under ob=price it IS the
      // implicit direction, so carrying it forward would be noise.
      const url = sorted(`${BASE}?od=asc`, 'price', 'asc');
      expect(url.searchParams.get('od')).toBeNull();
    });

    it('treats selecting defaultSortBy as "no column"', () => {
      const url = applySortToUrl(
        `${BASE}?ob=price`,
        { sortBy: 'price', sortOrder: 'desc' },
        'price'
      );
      expect(url.searchParams.get('ob')).toBeNull();
      // desc is implicit with no column, so od goes too.
      expect(url.searchParams.get('od')).toBeNull();
    });
  });

  describe('paging', () => {
    it('resets the page, because the offset now points at unrelated products', () => {
      const url = sorted(`${BASE}?page=3`, 'price', 'desc');
      expect(url.searchParams.get('page')).toBeNull();
    });

    it('resets the page on a direction toggle too', () => {
      expect(sorted(`${BASE}?page=3`, '', 'asc').searchParams.get('page')).toBeNull();
    });
  });

  it('leaves unrelated params — facets, limit — untouched', () => {
    const url = sorted(`${BASE}?color=12&color=15&limit=36&page=2`, 'name', 'desc');
    expect(url.searchParams.getAll('color')).toEqual(['12', '15']);
    expect(url.searchParams.get('limit')).toBe('36');
    expect(url.pathname).toBe('/women-shoes');
  });

  it('does not mutate the input URL', () => {
    const input = new URL(`${BASE}?page=2`);
    applySortToUrl(input, { sortBy: 'price', sortOrder: 'desc' });
    expect(input.searchParams.get('page')).toBe('2');
  });
});
