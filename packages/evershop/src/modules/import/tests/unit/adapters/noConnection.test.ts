import { describe, expect, it, jest } from '@jest/globals';

/**
 * The test doubles and the pure parts of the import must not load core's
 * database connection: a suite that writes through core's services points the
 * pool at its scratch database BEFORE anything reaches it, and an import that
 * comes earlier (`MemoryLookup` pulls in the check of a custom field) would
 * create the pool for the store's own database first. This test makes loading
 * the connection an error.
 */
jest.unstable_mockModule('../../../../../lib/postgres/connection.js', () => {
  throw new Error('the database connection of core was loaded');
});

describe('what the tests import first', () => {
  it('MemoryLookup does not load the connection', async () => {
    const { MemoryLookup } = await import('../../../testing/MemoryLookup.js');
    const lookup = new MemoryLookup({
      metafieldDefinitions: {
        product: [{ namespace: 'custom', key: 'a', type: 'integer' }]
      }
    });
    const field = (await lookup.metafields('product')).get('custom.a');
    expect(field?.check(3)).toEqual({ ok: true, value: 3 });
  });

  it('the check of a custom field does not load it either', async () => {
    const { toStoredMetafield } = await import(
      '../../../adapters/metafieldCheck.js'
    );
    expect(typeof toStoredMetafield).toBe('function');
  });
});
