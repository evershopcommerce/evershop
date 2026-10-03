import { afterEach, describe, expect, it, jest } from '@jest/globals';
import {
  createFakeDb,
  createFakeQueryBuilder
} from '../../../customer/tests/unit/fakeQueryBuilder.js';

/** The `Address` GraphQL layer (spec § 3.7): shared field map, type resolution, regions and country scopes. */
const settingValues: Record<string, unknown> = { storeCountry: 'VN' };
jest.unstable_mockModule('../../../setting/services/setting.js', () => ({
  getSetting: async (name: string, defaultValue: unknown) =>
    settingValues[name] !== undefined ? settingValues[name] : defaultValue,
  getSettingSync: (name: string, defaultValue: unknown) =>
    settingValues[name] !== undefined ? settingValues[name] : defaultValue,
  getStoreLanguageSync: () => 'en'
}));
const db = createFakeDb({ shipping_zone_country: [{ country: 'US' }, { country: 'VN' }] });
const qb = createFakeQueryBuilder(db);
jest.unstable_mockModule('@evershop/postgres-query-builder', () => ({ ...qb }));
jest.unstable_mockModule('../../../../lib/postgres/connection.js', () => ({ pool: qb.pool }));

const { default: addressResolvers } = await import('../../graphql/types/Address/Address.resolvers.js');
const { default: countryResolvers } = await import('../../graphql/types/Country/Country.resolvers.js');
const { toGraphqlAddress, addressFieldResolvers } = await import('../../services/address/graphqlAddress.js');

const ROW = {
  order_address_id: 9,
  uuid: 'o-9',
  recipient: 'Jane Smith',
  address_line_1: '1600 Amphitheatre Pkwy',
  address_line_2: 'Suite 200',
  locality: 'Mountain View',
  administrative_area: 'US-CA',
  postal_code: '94043',
  country: 'US',
  telephone: '+16502530000',
  extra: { tax_id: '123', delivery_note: 'ring twice' }
};

describe('Address field resolvers', () => {
  const parent = toGraphqlAddress(ROW, 'OrderAddress');

  it('keeps camelCase scalars, the raw extra and the typename', () => {
    expect(parent).toMatchObject({ addressLine1: '1600 Amphitheatre Pkwy', postalCode: '94043', __typename: 'OrderAddress' });
    expect(addressFieldResolvers.extra(parent)).toEqual({ tax_id: '123', delivery_note: 'ring twice' });
    expect(addressResolvers.Address.__resolveType(parent)).toBe('OrderAddress');
  });

  it('every level below country is a Region; free text keeps the typed value as its name', async () => {
    expect(await addressFieldResolvers.administrativeArea(parent)).toEqual({ key: 'US-CA', name: 'California', isoCode: 'US-CA' });
    expect(await addressFieldResolvers.locality(parent)).toEqual({ key: 'Mountain View', name: 'Mountain View', isoCode: null });
    expect(await addressFieldResolvers.dependentLocality(parent)).toBeNull();
    expect(addressFieldResolvers.country(parent)).toEqual({ code: 'US', name: 'United States' });
  });

  it('formatted renders the row for the request locale', async () => {
    expect(await addressFieldResolvers.formatted(parent)).toEqual([
      'Jane Smith',
      '1600 Amphitheatre Pkwy',
      'Suite 200',
      'Mountain View, California 94043',
      'United States'
    ]);
  });

  it('a legacy order on a retired key still names its region', async () => {
    const legacy = toGraphqlAddress({ ...ROW, country: 'VN', administrative_area: 'VN-57' }, 'OrderAddress');
    expect(await addressFieldResolvers.administrativeArea(legacy)).toMatchObject({ key: 'VN-57', name: 'Binh Duong' });
  });

  it('Region.name falls back to the key', () => {
    expect(addressResolvers.Region.name({ key: 'X-1', name: '' })).toBe('X-1');
  });
});

describe('regions and addressSchema queries', () => {
  it('regions excludes retired keys and names them for the reader', async () => {
    const regions = await addressResolvers.Query.regions({}, { country: 'VN' });
    const keys = regions.map((r: { key: string }) => r.key);
    expect(keys).toContain('VN-SG');
    expect(keys).not.toContain('VN-57');
    expect(regions.find((r: { key: string }) => r.key === 'VN-SG')).toMatchObject({ name: 'Ho Chi Minh' });
    expect((await addressResolvers.Query.regions({}, { country: 'VN', locale: 'vi' })).find((r: { key: string }) => r.key === 'VN-SG')).toMatchObject({ name: 'Hồ Chí Minh' });
  });

  it('addressSchema: Hong Kong collects no postal code; no country resolves the store default', () => {
    const hk = addressResolvers.Query.addressSchema({}, { country: 'HK' });
    expect(hk.country).toBe('HK');
    expect(hk.fields.some((f: { id: string }) => f.id === 'postal_code')).toBe(false);
    expect(hk.fields[0]).toMatchObject({ id: 'country', row: 0 });
    expect(addressResolvers.Query.addressSchema({}, {}).country).toBe('VN');
  });
});

describe('countries(scope:)', () => {
  const { getSettingSync } = { getSettingSync: (k: string) => settingValues[k] };
  afterEach(() => {
    delete settingValues.addressSellToCountries;
  });

  it('ALL is every country, SELL_TO the list, SHIPPING the list ∩ zone countries', async () => {
    settingValues.addressSellToCountries = ['US', 'DE', 'VN'];
    const all = await countryResolvers.Query.countries({}, { scope: 'ALL' });
    expect(all.length).toBeGreaterThan(200);
    const sellTo = await countryResolvers.Query.countries({}, { scope: 'SELL_TO' });
    expect(sellTo.map((c: { code: string }) => c.code)).toEqual(['DE', 'US', 'VN']);
    const shipping = await countryResolvers.Query.countries({}, { scope: 'SHIPPING' });
    expect(shipping.map((c: { code: string }) => c.code)).toEqual(['US', 'VN']);
    expect(getSettingSync('storeCountry')).toBe('VN');
  });

  it('with `all`, SELL_TO is every country and SHIPPING is the zone countries', async () => {
    expect((await countryResolvers.Query.countries({}, { scope: 'SELL_TO' })).length).toBeGreaterThan(200);
    expect((await countryResolvers.Query.countries({}, { scope: 'SHIPPING' })).map((c: { code: string }) => c.code)).toEqual(['US', 'VN']);
  });

  it('Country.name resolves a code string or a { code } object, never throws on an unknown code', () => {
    expect(countryResolvers.Country.name('VN')).toBe('Vietnam');
    expect(countryResolvers.Country.name({ code: 'DE' })).toBe('Germany');
    expect(countryResolvers.Country.name({ code: 'ZQ' })).toBe('ZQ');
    expect(countryResolvers.Country.code({ code: 'DE' })).toBe('DE');
  });
});
