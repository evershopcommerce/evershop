import { describe, expect, it, jest } from '@jest/globals';
import {
  createFakeDb,
  createFakeQueryBuilder
} from '../../../customer/tests/unit/fakeQueryBuilder.js';

/**
 * Stale references in merchant data (spec § 3.3, § 3.13, D-21). The fake query
 * builder ignores joins and aliases, so the joined projections are seeded
 * with the alias names the service selects.
 */
const settingValues: Record<string, unknown> = {
  storeCountry: 'VN',
  storeProvince: 'VN-57',
  addressSellToCountries: ['US', 'VN']
};
jest.unstable_mockModule('../../../setting/services/setting.js', () => ({
  getSetting: async (name: string, defaultValue: unknown) =>
    settingValues[name] !== undefined ? settingValues[name] : defaultValue,
  getSettingSync: (name: string, defaultValue: unknown) =>
    settingValues[name] !== undefined ? settingValues[name] : defaultValue,
  getStoreLanguageSync: () => 'en'
}));
const db = createFakeDb({
  shipping_zone_region: [
    { country: 'VN', level: 'administrative_area', region_key: 'VN-57', zone_uuid: 'z1', zone_name: 'Vietnam' },
    { country: 'VN', level: 'administrative_area', region_key: 'VN-SG', zone_uuid: 'z1', zone_name: 'Vietnam' },
    { country: 'US', level: 'administrative_area', region_key: 'US-CA', zone_uuid: 'z2', zone_name: 'West' },
    { country: 'US', level: 'administrative_area', region_key: 'US-XX', zone_uuid: 'z2', zone_name: 'West' }
  ],
  tax_rate: [
    { uuid: 't1', name: 'VN tax', country: 'VN', administrative_area: 'VN-SG,VN-57,*' },
    { uuid: 't2', name: 'multi-country', country: 'US,CA', administrative_area: 'US-CA' },
    { uuid: 't3', name: 'wildcard', country: '*', administrative_area: '*' }
  ],
  shipping_zone_country: [
    { country: 'US', zone_uuid: 'z2', zone_name: 'West' },
    { country: 'CN', zone_uuid: 'z3', zone_name: 'Asia' }
  ]
});
const qb = createFakeQueryBuilder(db);
jest.unstable_mockModule('@evershop/postgres-query-builder', () => ({ ...qb }));
jest.unstable_mockModule('../../../../lib/postgres/connection.js', () => ({ pool: qb.pool }));

const { getAddressConfigWarnings } = await import('../../services/address/addressConfigWarnings.js');

describe('addressConfigWarnings', () => {
  it('flags retired and unknown region keys on zones, tax rates and the store address, with the successor', async () => {
    const warnings = await getAddressConfigWarnings('en');
    const retired = warnings.filter((w) => w.kind === 'retired_region');
    expect(retired.map((w) => `${w.source}:${w.sourceId}:${w.key}`).sort()).toEqual(
      ['shipping_zone:z1:VN-57', 'shipping_zone:z2:US-XX', 'store_address:storeProvince:VN-57', 'tax_rate:t1:VN-57'].sort()
    );
    const binhDuong = retired.find((w) => w.source === 'shipping_zone' && w.key === 'VN-57');
    expect(binhDuong).toMatchObject({
      country: 'VN',
      level: 'administrative_area',
      sourceName: 'Vietnam',
      keyName: 'Binh Duong',
      mergedInto: { key: 'VN-SG', name: 'Ho Chi Minh' }
    });
    // An unknown key has no name to show and no successor.
    expect(retired.find((w) => w.key === 'US-XX')).toMatchObject({ keyName: 'US-XX', mergedInto: null });
  });

  it('skips wildcards, multi-country rates and active keys', async () => {
    const warnings = await getAddressConfigWarnings('en');
    expect(warnings.some((w) => w.key === '*')).toBe(false);
    expect(warnings.some((w) => w.sourceId === 't2' || w.sourceId === 't3')).toBe(false);
    expect(warnings.some((w) => w.key === 'VN-SG' || w.key === 'US-CA')).toBe(false);
  });

  it('flags a zone country outside the sell-to list, never one inside it, and nothing for `all`', async () => {
    const warnings = await getAddressConfigWarnings('en');
    const notSold = warnings.filter((w) => w.kind === 'country_not_sold_to');
    expect(notSold).toEqual([
      expect.objectContaining({ source: 'shipping_zone', sourceId: 'z3', sourceName: 'Asia', country: 'CN' })
    ]);
    settingValues.addressSellToCountries = 'all';
    expect((await getAddressConfigWarnings('en')).some((w) => w.kind === 'country_not_sold_to')).toBe(false);
  });
});
