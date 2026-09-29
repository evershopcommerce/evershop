import {
  NEWEST_PRODUCTS_COLLECTION_CODE,
  getVirtualCollection,
  isVirtualCollection,
  isVirtualCollectionCode,
  listVirtualCollections
} from '../../../../lib/util/virtualCollection.js';

// A theme cannot know a store's collections, and activation must never seed
// them. A virtual collection is answered by a query instead of by rows, so a
// merchandising widget resolves on any store.
describe('virtual collections', () => {
  it('uses a code nobody types by accident', () => {
    expect(NEWEST_PRODUCTS_COLLECTION_CODE).toBe('__evershop_newest_products__');
    expect(isVirtualCollectionCode(NEWEST_PRODUCTS_COLLECTION_CODE)).toBe(true);
    for (const code of ['new-arrivals', 'newest', '', null, undefined, 42]) {
      expect(isVirtualCollectionCode(code)).toBe(false);
    }
  });

  it('builds a collection whose every non-null schema field is populated', () => {
    const c = getVirtualCollection(NEWEST_PRODUCTS_COLLECTION_CODE);
    expect(c).toEqual({
      collectionId: 0,
      uuid: '00000000-0000-4000-8000-000000000001',
      name: 'Products',
      code: NEWEST_PRODUCTS_COLLECTION_CODE,
      description: null
    });
    expect(isVirtualCollection(c!)).toBe(true);
    // `Collection` declares collectionId/uuid/name/code as non-null. A null in
    // any of them makes GraphQL null the whole field and the widget shows its
    // "pick a collection" placeholder — which is exactly what a null
    // collectionId did on 2026-09-17.
    for (const field of ['collectionId', 'uuid', 'name', 'code'] as const) {
      expect(c![field]).not.toBeNull();
      expect(c![field]).not.toBeUndefined();
    }
  });

  it('returns nothing for a code it does not own, so a real lookup stays authoritative', () => {
    expect(getVirtualCollection('autumn-menu')).toBeNull();
    expect(getVirtualCollection(null)).toBeNull();
  });

  it('never mistakes a real collection row for a virtual one', () => {
    expect(isVirtualCollection({ collectionId: 7, code: NEWEST_PRODUCTS_COLLECTION_CODE })).toBe(false);
    expect(isVirtualCollection({ collectionId: null, code: 'autumn-menu' })).toBe(false);
    expect(isVirtualCollection({ collectionId: 0, code: 'autumn-menu' })).toBe(false);
    expect(isVirtualCollection({ collectionId: 7, code: 'autumn-menu' })).toBe(false);
  });

  it('hands out copies, so a caller cannot mutate the definition', () => {
    const first = getVirtualCollection(NEWEST_PRODUCTS_COLLECTION_CODE)!;
    first.name = 'Changed';
    expect(getVirtualCollection(NEWEST_PRODUCTS_COLLECTION_CODE)!.name).toBe('Products');
    expect(listVirtualCollections().map((c) => c.code)).toEqual([
      NEWEST_PRODUCTS_COLLECTION_CODE
    ]);
  });
});

// The page builder renders the REAL storefront widgets in its iframe, with an
// admin session, so the resolver must answer there too — gating on `user` left
// every preview showing "pick a collection" (2026-09-17). The admin's own
// collection surfaces cannot reach this resolver: the grid and pickers list rows
// through `collections`, and the edit route looks a row up by uuid and 404s.
describe('virtual collections resolve for any caller', () => {
  const resolverFor = async () => {
    const mod = await import(
      '../../graphql/types/Collection/Collection.resolvers.js'
    );
    return (mod.default as any).Query.collection;
  };
  // The query builder releases the connection it was handed, so the stub must
  // look like a pool, not just answer queries.
  const emptyPool = {
    query: async () => ({ rows: [], rowCount: 0 }),
    release: () => undefined
  };

  it('answers the storefront with the virtual collection', async () => {
    const collection = await resolverFor();
    const result = await collection(
      null,
      { code: NEWEST_PRODUCTS_COLLECTION_CODE },
      { pool: emptyPool, user: undefined }
    );
    expect(result?.code).toBe(NEWEST_PRODUCTS_COLLECTION_CODE);
  });

  it('answers the page builder too, so widget previews render', async () => {
    const collection = await resolverFor();
    const result = await collection(
      null,
      { code: NEWEST_PRODUCTS_COLLECTION_CODE },
      { pool: emptyPool, user: { uuid: 'admin-1' } }
    );
    expect(result?.code).toBe(NEWEST_PRODUCTS_COLLECTION_CODE);
  });

  it('still returns nothing for a code it does not own', async () => {
    const collection = await resolverFor();
    const result = await collection(
      null,
      { code: 'not-a-collection' },
      { pool: emptyPool, user: undefined }
    );
    expect(result).toBeNull();
  });
});
