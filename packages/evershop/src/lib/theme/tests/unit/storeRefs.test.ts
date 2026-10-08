import {
  applyStoreRefs,
  collectStoreRefs,
  isUnsupportedStoreRef,
  resolveStoreRefs,
  storeRefToken
} from '../../storeRefs.js';

// A theme cannot know a store's uuids, so its widgets name store data by
// business key and `theme:active` looks it up. Activation never creates data:
// an unmatched reference empties the setting and is reported.
const settings = {
  collection: storeRefToken('collection', 'code', 'autumn-menu'),
  nested: { hero: { productUuid: 'store-ref:product/sku/CAKE-SIG-01' } },
  heading: 'The autumn menu',
  count: 4
};

const poolWith = (rows: Record<string, unknown[]>) => ({
  query: async (sql: string, params?: unknown[]) => {
    if (/FROM collection WHERE code/.test(sql)) {
      return { rows: (rows.collectionByCode ?? []).filter((r: any) => r.code === params![0]) };
    }
    if (/FROM collection$/m.test(sql.trim())) {
      return { rows: rows.collections ?? [] };
    }
    if (/FROM product WHERE sku/.test(sql)) {
      return { rows: (rows.productBySku ?? []).filter((r: any) => r.sku === params![0]) };
    }
    if (/product_description/.test(sql)) {
      return { rows: rows.products ?? [] };
    }
    return { rows: [] };
  }
});

describe('store references', () => {
  it('collects every token once, with its entity and key', () => {
    expect(collectStoreRefs(settings)).toEqual([
      { token: 'store-ref:collection/code/autumn-menu', entity: 'collection', by: 'code', key: 'autumn-menu' },
      { token: 'store-ref:product/sku/CAKE-SIG-01', entity: 'product', by: 'sku', key: 'CAKE-SIG-01' }
    ]);
  });

  it('flags a token this version cannot resolve', () => {
    expect(isUnsupportedStoreRef('store-ref:category/path//cakes')).toBe(true);
    expect(isUnsupportedStoreRef('store-ref:product/sku/CAKE-01')).toBe(false);
    expect(isUnsupportedStoreRef('/assets/demo/a.jpg')).toBe(false);
  });

  it('matches on the business key first', async () => {
    const pool = poolWith({
      collectionByCode: [{ code: 'autumn-menu' }],
      productBySku: [{ uuid: 'p-uuid-1', sku: 'CAKE-SIG-01' }]
    });
    const out = await resolveStoreRefs(pool as never, collectStoreRefs(settings));
    expect(out.map((r) => [r.entity, r.match, r.value])).toEqual([
      ['collection', 'exact', 'autumn-menu'],
      ['product', 'exact', 'p-uuid-1']
    ]);
  });

  it('falls back to a name that slugifies to the key', async () => {
    const pool = poolWith({
      collections: [{ code: 'seasonal-2026', name: 'Autumn Menu' }],
      products: [{ uuid: 'p-uuid-2', name: 'Cake Sig 01' }]
    });
    const out = await resolveStoreRefs(pool as never, collectStoreRefs(settings));
    expect(out.map((r) => [r.match, r.value])).toEqual([
      ['name', 'seasonal-2026'],
      ['name', 'p-uuid-2']
    ]);
  });

  it('leaves a reference unresolved rather than inventing data', async () => {
    const out = await resolveStoreRefs(poolWith({}) as never, collectStoreRefs(settings));
    expect(out.every((r) => r.match === 'unresolved' && r.value === '')).toBe(true);
  });

  it('survives a table that is not there', async () => {
    const broken = { query: async () => { throw new Error('relation does not exist'); } };
    const out = await resolveStoreRefs(broken as never, collectStoreRefs(settings));
    expect(out.map((r) => r.match)).toEqual(['unresolved', 'unresolved']);
  });

  it('substitutes resolved values and empties the rest, without touching the input', async () => {
    const pool = poolWith({ collectionByCode: [{ code: 'autumn-menu' }] });
    const resolved = await resolveStoreRefs(pool as never, collectStoreRefs(settings));
    const out = applyStoreRefs(settings, resolved);
    expect(out.collection).toBe('autumn-menu');
    // Unmatched: an empty setting, so the widget shows its own empty state
    // rather than querying for a product that does not exist.
    expect(out.nested.hero.productUuid).toBe('');
    expect(out.heading).toBe('The autumn menu');
    expect(out.count).toBe(4);
    expect(settings.collection).toBe('store-ref:collection/code/autumn-menu');
  });

  it('is a no-op when the manifest has no references', () => {
    expect(applyStoreRefs(settings, [])).toBe(settings);
  });
});
