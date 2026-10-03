import { describe, expect, it, jest } from '@jest/globals';
import {
  createFakeDb,
  createFakeQueryBuilder
} from '../../../../customer/tests/unit/fakeQueryBuilder.js';

/**
 * Zone matching on `shipping_zone_region` (spec § 3.10, § 5.2). The fake
 * query builder ignores joins, so the candidate query's rows are seeded as
 * the joined projection (one `shipping_zone` row per zone/country pair).
 */
const db = createFakeDb({
  shipping_zone: [
    { shipping_zone_id: 1, uuid: 'z1', name: 'US whole', country: 'US' },
    { shipping_zone_id: 2, uuid: 'z2', name: 'US West', country: 'US' },
    { shipping_zone_id: 3, uuid: 'z3', name: 'VN legacy', country: 'VN' }
  ],
  shipping_zone_region: [
    { zone_id: 2, country: 'US', level: 'administrative_area', region_key: 'US-CA' },
    { zone_id: 2, country: 'US', level: 'administrative_area', region_key: 'US-NV' },
    // A key retired by the 2025 merger, still stored on the zone.
    { zone_id: 3, country: 'VN', level: 'administrative_area', region_key: 'VN-57' }
  ]
});
const qb = createFakeQueryBuilder(db);
jest.unstable_mockModule('@evershop/postgres-query-builder', () => ({ ...qb }));
jest.unstable_mockModule('../../../../../lib/postgres/connection.js', () => ({ pool: qb.pool }));

const { resolveZonesForAddress } = await import('../../../services/shipping/resolveZonesForAddress.js');
const ids = (zones: Array<{ shipping_zone_id: number }>) => zones.map((z) => z.shipping_zone_id).sort();

describe('resolveZonesForAddress', () => {
  it('matches a whole-country zone and a region-restricted zone at once (overlap allowed)', async () => {
    expect(ids(await resolveZonesForAddress({ country: 'US', administrativeArea: 'US-CA' }))).toEqual([1, 2]);
  });

  it('a region-restricted zone does not match another region, nor a missing one', async () => {
    expect(ids(await resolveZonesForAddress({ country: 'US', administrativeArea: 'US-NY' }))).toEqual([1]);
    expect(ids(await resolveZonesForAddress({ country: 'US' }))).toEqual([1]);
  });

  it('a retired key on a zone never matches a new address, while a legacy address with that key still does', async () => {
    expect(await resolveZonesForAddress({ country: 'VN', administrativeArea: 'VN-SG' })).toEqual([]);
    expect(ids(await resolveZonesForAddress({ country: 'VN', administrativeArea: 'VN-57' }))).toEqual([3]);
  });

  it('returns nothing for an uncovered or missing country', async () => {
    expect(await resolveZonesForAddress({ country: 'DE' })).toEqual([]);
    expect(await resolveZonesForAddress({ country: '' })).toEqual([]);
  });
});
