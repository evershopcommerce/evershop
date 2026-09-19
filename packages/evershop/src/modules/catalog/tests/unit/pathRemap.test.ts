import { CatalogUrn } from '../../../../lib/urn/index.js';
import {
  buildEntityPath,
  remapPath,
  isUnderPrefix,
  planSubtreeRedirects,
  UrlRewriteRow
} from '../../services/redirect/pathRemap.js';

/**
 * Pure-function coverage for the URL-redirect path algebra. Every case ID below
 * maps to a scenario in the redirect case matrix (wiki/url-redirects.md). No DB —
 * these assert the LOGIC that the capture services and the url_rewrite subscriber
 * both delegate to, so a boundary/prefix bug is caught here, not in production.
 */

const CAT = 'c0000000-0000-0000-0000-000000000001';
const SUB = 'c0000000-0000-0000-0000-000000000002';
const PROD = 'a0000000-0000-0000-0000-000000000003';

describe('buildEntityPath', () => {
  it.each([
    [null, 'shoes', '/shoes'],
    ['/women', 'footwear', '/women/footwear'],
    ['/electronics/laptops', 'thinkpad', '/electronics/laptops/thinkpad']
  ])('buildEntityPath(%p, %p) === %p', (prefix, key, expected) => {
    expect(buildEntityPath(prefix as string | null, key as string)).toBe(
      expected
    );
  });
});

describe('remapPath (boundary-anchored, leading-prefix only)', () => {
  it.each([
    // [label, path, oldPrefix, newPrefix, expected]
    // C1: top-level rename, exact-match of the category's own path
    ['C1 own path exact', '/electronics', '/electronics', '/tech', '/tech'],
    // C1/C2: a genuine descendant is remapped at the boundary
    [
      'C2 descendant',
      '/electronics/laptops/thinkpad',
      '/electronics',
      '/tech',
      '/tech/laptops/thinkpad'
    ],
    // C3/C5: reparent — the whole old prefix is swapped for the new ancestry
    [
      'C3 reparent descendant',
      '/mens/shoes/boot',
      '/mens/shoes',
      '/women/shoes',
      '/women/shoes/boot'
    ],
    // C8: prefix-collision SIBLING must NOT be swept ("/shoe" must not touch "/shoe-sale")
    ['C8 sibling not swept', '/shoe-sale', '/shoe', '/sneaker', '/shoe-sale'],
    [
      'C8 sibling mid-path not swept',
      '/mens/shoe-care',
      '/mens/shoe',
      '/mens/boot',
      '/mens/shoe-care'
    ],
    // C9: descendant slug repeats the parent segment — only the LEADING segment moves
    [
      'C9 no mangle',
      '/cat/cat-toy',
      '/cat',
      '/animal',
      '/animal/cat-toy'
    ],
    [
      'C9 no mangle deep',
      '/cat/cat-toy/cat-ball',
      '/cat',
      '/animal',
      '/animal/cat-toy/cat-ball'
    ],
    // C4: reparent to root — the descendant path loses the old top segment
    [
      'C4 to root descendant',
      '/electronics/laptops/gaming',
      '/electronics/laptops',
      '/laptops',
      '/laptops/gaming'
    ],
    // Not a leading prefix (mid-path occurrence) — unchanged
    ['mid-path unchanged', '/x/cat/y', '/cat', '/z', '/x/cat/y'],
    // Unrelated path — unchanged
    ['unrelated unchanged', '/furniture/desk', '/shoe', '/boot', '/furniture/desk']
  ] as Array<[string, string, string, string, string]>)(
    '%s',
    (_label, path, oldPrefix, newPrefix, expected) => {
      expect(remapPath(path, oldPrefix, newPrefix)).toBe(expected);
    }
  );

  it('is idempotent for a path already under the new prefix', () => {
    // renaming /a -> /b then re-running with the same args must not double-apply
    const once = remapPath('/a/x', '/a', '/b');
    expect(remapPath(once, '/a', '/b')).toBe('/b/x');
  });
});

describe('isUnderPrefix', () => {
  it.each([
    ['/shoe', '/shoe', true],
    ['/shoe/nike', '/shoe', true],
    ['/shoe-sale', '/shoe', false],
    ['/x/shoe', '/shoe', false]
  ])('isUnderPrefix(%p, %p) === %p', (path, prefix, expected) => {
    expect(isUnderPrefix(path as string, prefix as string)).toBe(expected);
  });
});

describe('planSubtreeRedirects', () => {
  it('C2: nested rename remaps self + descendants, drops nothing', () => {
    const rows: UrlRewriteRow[] = [
      { request_path: '/electronics/laptops', entity_uuid: CAT, entity_type: 'category' },
      { request_path: '/electronics/laptops/gaming', entity_uuid: SUB, entity_type: 'category' },
      { request_path: '/electronics/laptops/thinkpad', entity_uuid: PROD, entity_type: 'product' }
    ];
    const specs = planSubtreeRedirects(
      '/electronics/laptops',
      '/electronics/notebooks',
      rows
    );
    expect(specs).toEqual([
      {
        fromPath: '/electronics/laptops',
        toPath: '/electronics/notebooks',
        entityUrn: CatalogUrn.category(CAT)
      },
      {
        fromPath: '/electronics/laptops/gaming',
        toPath: '/electronics/notebooks/gaming',
        entityUrn: CatalogUrn.category(SUB)
      },
      {
        fromPath: '/electronics/laptops/thinkpad',
        toPath: '/electronics/notebooks/thinkpad',
        entityUrn: CatalogUrn.product(PROD)
      }
    ]);
  });

  it('C3/C6: reparent (with rename) targets the NEW ancestry for the whole subtree', () => {
    const rows: UrlRewriteRow[] = [
      { request_path: '/mens/shoes', entity_uuid: CAT, entity_type: 'category' },
      { request_path: '/mens/shoes/boot', entity_uuid: PROD, entity_type: 'product' }
    ];
    // combined rename+reparent: /mens/shoes -> /women/footwear
    const specs = planSubtreeRedirects('/mens/shoes', '/women/footwear', rows);
    expect(specs.map((s) => [s.fromPath, s.toPath])).toEqual([
      ['/mens/shoes', '/women/footwear'],
      ['/mens/shoes/boot', '/women/footwear/boot']
    ]);
  });

  it('C8: a prefix-collision sibling row in the set is left out (no-op dropped)', () => {
    const rows: UrlRewriteRow[] = [
      { request_path: '/shoe', entity_uuid: CAT, entity_type: 'category' },
      { request_path: '/shoe/nike', entity_uuid: PROD, entity_type: 'product' },
      // sibling that a naive substring query might have included
      { request_path: '/shoe-sale', entity_uuid: SUB, entity_type: 'category' }
    ];
    const specs = planSubtreeRedirects('/shoe', '/sneaker', rows);
    expect(specs.map((s) => s.fromPath)).toEqual(['/shoe', '/shoe/nike']);
    expect(specs.find((s) => s.fromPath === '/shoe-sale')).toBeUndefined();
  });

  it('stamps each row with its own entity URN', () => {
    const rows: UrlRewriteRow[] = [
      { request_path: '/a', entity_uuid: CAT, entity_type: 'category' },
      { request_path: '/a/p', entity_uuid: PROD, entity_type: 'product' }
    ];
    const specs = planSubtreeRedirects('/a', '/b', rows);
    expect(specs[0].entityUrn).toBe(CatalogUrn.category(CAT));
    expect(specs[1].entityUrn).toBe(CatalogUrn.product(PROD));
  });

  it('returns [] when the prefix does not actually change (no-op save)', () => {
    const rows: UrlRewriteRow[] = [
      { request_path: '/a', entity_uuid: CAT, entity_type: 'category' },
      { request_path: '/a/p', entity_uuid: PROD, entity_type: 'product' }
    ];
    expect(planSubtreeRedirects('/a', '/a', rows)).toEqual([]);
  });
});
