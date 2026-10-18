import { describe, it, expect, beforeEach } from '@jest/globals';
import type { Lookup, StoreFixture } from '../../../services/ports/lookup.js';

/** A lookup and the way to put a store, described as data, behind it. */
export interface LookupHarness {
  lookup: Lookup;
  /** Makes the store what the fixture says, and nothing more. */
  set(fixture: StoreFixture): Promise<void>;
}

/**
 * What every `Lookup` must answer (§ 4.5, point 6). It runs against
 * `MemoryLookup` in the unit tests and against `PgLookup` on a database, so a
 * double that answers differently from the real thing cannot pass.
 */
export function lookupContract(
  label: string,
  make: () => Promise<LookupHarness>
): void {
  describe(`${label}: the contract of a Lookup`, () => {
    let h: LookupHarness;

    beforeEach(async () => {
      h = await make();
    });

    describe('categories', () => {
      it('gives a stored category with its name, status and parent', async () => {
        await h.set({
          categories: [
            { urlKey: 'women', name: 'Women', status: 1 },
            { urlKey: 'shoes', name: 'Shoes', status: 0, parentUrlKey: 'women' }
          ]
        });
        const found = await h.lookup.categories(['women', 'shoes']);
        expect([...found.keys()].sort()).toEqual(['shoes', 'women']);
        expect(found.get('women')).toMatchObject({
          urlKey: 'women',
          name: 'Women',
          status: 1,
          parentUrlKey: null
        });
        expect(found.get('shoes')).toMatchObject({
          urlKey: 'shoes',
          name: 'Shoes',
          status: 0,
          parentUrlKey: 'women'
        });
        const women = found.get('women');
        expect(typeof women?.id).toBe('number');
        expect(typeof women?.uuid).toBe('string');
        expect(found.get('shoes')?.id).not.toBe(women?.id);
      });

      it('leaves out a key that is not stored', async () => {
        await h.set({ categories: [{ urlKey: 'women' }] });
        const found = await h.lookup.categories(['women', 'men', 'kids']);
        expect([...found.keys()]).toEqual(['women']);
      });

      it('answers an empty question with an empty answer', async () => {
        await h.set({ categories: [{ urlKey: 'women' }] });
        expect((await h.lookup.categories([])).size).toBe(0);
      });

      it('answers a batch of a thousand keys', async () => {
        await h.set({
          categories: [{ urlKey: 'key-0007' }, { urlKey: 'key-0950' }]
        });
        const keys = Array.from(
          { length: 1000 },
          (_, n) => `key-${String(n).padStart(4, '0')}`
        );
        const found = await h.lookup.categories(keys);
        expect([...found.keys()].sort()).toEqual(['key-0007', 'key-0950']);
      });

      it('matches a key as it is written, letter case included', async () => {
        await h.set({ categories: [{ urlKey: 'women' }] });
        expect((await h.lookup.categories(['Women'])).size).toBe(0);
        expect((await h.lookup.categories(['women'])).size).toBe(1);
        await h.set({ categories: [{ urlKey: 'Kids' }] });
        expect((await h.lookup.categories(['kids'])).size).toBe(0);
        expect([...(await h.lookup.categories(['Kids'])).keys()]).toEqual([
          'Kids'
        ]);
      });

      it('gives the parent of a category that is itself a child', async () => {
        await h.set({
          categories: [
            { urlKey: 'a' },
            { urlKey: 'b', parentUrlKey: 'a' },
            { urlKey: 'c', parentUrlKey: 'b' }
          ]
        });
        const found = await h.lookup.categories(['c']);
        expect(found.get('c')?.parentUrlKey).toBe('b');
      });

      it('sees the store as it is now, not as it was at the last question', async () => {
        await h.set({ categories: [{ urlKey: 'women' }] });
        expect((await h.lookup.categories(['women'])).size).toBe(1);
        await h.set({ categories: [{ urlKey: 'men' }] });
        expect([
          ...(await h.lookup.categories(['women', 'men'])).keys()
        ]).toEqual(['men']);
      });
    });

    describe('reservedUrlKeys', () => {
      it('gives the keys a url_key must not equal', async () => {
        await h.set({ reservedUrlKeys: ['cart', 'checkout', 'en', 'vi'] });
        expect([...(await h.lookup.reservedUrlKeys())].sort()).toEqual([
          'cart',
          'checkout',
          'en',
          'vi'
        ]);
      });

      it('gives none when there are none', async () => {
        await h.set({});
        expect((await h.lookup.reservedUrlKeys()).size).toBe(0);
      });
    });

    describe('metafieldKeys', () => {
      it('gives namespace.key of the definitions of one entity', async () => {
        await h.set({
          metafields: {
            category: ['custom.banner', 'seo.title'],
            product: ['custom.material'],
            customer: ['custom.vip']
          }
        });
        expect([...(await h.lookup.metafieldKeys('category'))].sort()).toEqual([
          'custom.banner',
          'seo.title'
        ]);
        expect([...(await h.lookup.metafieldKeys('product'))]).toEqual([
          'custom.material'
        ]);
        expect([...(await h.lookup.metafieldKeys('customer'))]).toEqual([
          'custom.vip'
        ]);
      });

      it('gives none for an entity without definitions, and for addresses', async () => {
        await h.set({ metafields: { category: ['custom.banner'] } });
        expect((await h.lookup.metafieldKeys('product')).size).toBe(0);
        expect((await h.lookup.metafieldKeys('customerAddress')).size).toBe(0);
      });
    });
  });
}
