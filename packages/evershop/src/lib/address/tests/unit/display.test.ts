import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import type { AddressFormat, AddressLevel, AddressRow } from '../../types.js';

/**
 * `resolveAddressDisplayValues` maps a row to token values, resolving region
 * keys through the registry and the country code through the country list;
 * `formatAddressRow` renders them with the record's layout for the locale.
 * The registries are mocked so only the mapping is under test.
 */

const REGION_NAMES: Record<string, string> = {
  'administrative_area:US-CA': 'California',
  'administrative_area:CN-GD': 'Guangdong',
  'locality:GZ': 'Guangzhou',
  'dependent_locality:TH': 'Tianhe',
  'administrative_area:VN-SG': 'Thành phố Hồ Chí Minh'
};
const LEVELS: Record<string, AddressLevel[]> = {
  US: ['administrative_area'],
  VN: ['administrative_area'],
  CN: ['administrative_area', 'locality', 'dependent_locality'],
  HK: ['administrative_area']
};
const COUNTRY_NAMES: Record<string, string> = {
  US: 'United States',
  CN: 'China',
  VN: 'Vietnam',
  HK: 'Hong Kong'
};
const FORMATS: Record<string, AddressFormat> = {
  ZZ: { fmt: '%N%n%O%n%A%n%C', require: 'AC' },
  US: { fmt: '%N%n%O%n%A%n%C, %S %Z', require: 'ACSZ', languages: ['en'] },
  HK: {
    fmt: '%S%n%C%n%A%n%O%n%N',
    lfmt: '%N%n%O%n%A%n%C%n%S',
    require: 'AS',
    languages: ['zh-Hant', 'en'],
    name_order: 'family_first'
  },
  VN: { fmt: '%N%n%O%n%A%n%C%n%S %Z', require: 'AS', languages: ['vi'], name_order: 'family_first' }
};

const resolveRegionName = jest.fn(
  async (_country: string, level: string, key: string, _locale?: string, _parentPath?: string[]) =>
    REGION_NAMES[`${level}:${key}`] ?? key
);
const getRegionLevels = jest.fn((country: string) => LEVELS[country] ?? []);
const getCountryName = jest.fn((code: string) => COUNTRY_NAMES[code] ?? '');
const getAddressFormat = jest.fn((code: string) => FORMATS[code] ?? FORMATS.ZZ);
const selectFormat = jest.fn((record: AddressFormat, locale: string) =>
  record.lfmt && locale.startsWith('en')
    ? { format: record.lfmt, script: 'latin' as const }
    : { format: record.fmt, script: 'native' as const }
);
const getLocale = jest.fn(() => 'en');
const getAddressRuntime = jest.fn(() => ({ getLocale }));

jest.unstable_mockModule('../../regions.js', () => ({ resolveRegionName, getRegionLevels }));
jest.unstable_mockModule('../../countries.js', () => ({ getCountryName }));
jest.unstable_mockModule('../../formats.js', () => ({ getAddressFormat }));
jest.unstable_mockModule('../../derive.js', () => ({ selectFormat }));
jest.unstable_mockModule('../../runtime.js', () => ({ getAddressRuntime }));

const { resolveAddressDisplayValues, formatAddressRow } = await import('../../display.js');

const usRow: AddressRow = {
  recipient: 'Jane Smith',
  organization: '',
  address_line_1: '1600 Amphitheatre Pkwy',
  address_line_2: null,
  address_line_3: 'Building 43',
  locality: 'Mountain View',
  administrative_area: 'US-CA',
  postal_code: '94043',
  country: 'us',
  telephone: '+1 650 253 0000'
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('resolveAddressDisplayValues', () => {
  it('maps a US row, resolving the state name and the country name', async () => {
    const values = await resolveAddressDisplayValues(usRow, 'en');
    expect(values).toEqual({
      N: 'Jane Smith',
      A: ['1600 Amphitheatre Pkwy', 'Building 43'],
      C: 'Mountain View',
      S: 'California',
      Z: '94043',
      country: 'United States'
    });
    expect(resolveRegionName).toHaveBeenCalledTimes(1);
    expect(resolveRegionName).toHaveBeenCalledWith('US', 'administrative_area', 'US-CA', 'en', []);
    expect(getCountryName).toHaveBeenCalledWith('US', 'en');
  });

  it('omits every empty value and the country when there is none', async () => {
    expect(await resolveAddressDisplayValues({})).toEqual({});
    expect(
      await resolveAddressDisplayValues({ recipient: ' ', address_line_1: '', locality: null })
    ).toEqual({});
    expect(resolveRegionName).not.toHaveBeenCalled();
    expect(getCountryName).not.toHaveBeenCalled();
  });

  it('uses the raw value for a free-text level', async () => {
    const values = await resolveAddressDisplayValues(
      { locality: 'Yau Tsim Mong', administrative_area: 'Kowloon', country: 'HK' },
      'en'
    );
    expect(values.C).toBe('Yau Tsim Mong');
    expect(values.S).toBe('Kowloon');
    expect(resolveRegionName).toHaveBeenCalledTimes(1);
    expect(resolveRegionName).toHaveBeenCalledWith('HK', 'administrative_area', 'Kowloon', 'en', []);
  });

  it('passes the outer enumerated keys as parent path for nested levels', async () => {
    const values = await resolveAddressDisplayValues(
      { administrative_area: 'CN-GD', locality: 'GZ', dependent_locality: 'TH', country: 'CN' },
      'zh'
    );
    expect(values).toMatchObject({ S: 'Guangdong', C: 'Guangzhou', D: 'Tianhe', country: 'China' });
    expect(resolveRegionName.mock.calls).toEqual([
      ['CN', 'administrative_area', 'CN-GD', 'zh', []],
      ['CN', 'locality', 'GZ', 'zh', ['CN-GD']],
      ['CN', 'dependent_locality', 'TH', 'zh', ['CN-GD', 'GZ']]
    ]);
  });

  it('composes the recipient from the parts in the record order when it is empty', async () => {
    const values = await resolveAddressDisplayValues({
      recipient: null,
      given_name: 'Văn A',
      family_name: 'Nguyễn',
      country: 'VN'
    });
    expect(values.N).toBe('Nguyễn Văn A');
    expect(getAddressFormat).toHaveBeenCalledWith('VN');
  });

  it('prefers the stored recipient over the parts', async () => {
    const values = await resolveAddressDisplayValues({
      recipient: 'Nguyễn Văn A',
      given_name: 'Văn A',
      family_name: 'Nguyễn',
      country: 'VN'
    });
    expect(values.N).toBe('Nguyễn Văn A');
    expect(getAddressFormat).not.toHaveBeenCalled();
  });

  it('falls back to the code when the country has no name', async () => {
    const values = await resolveAddressDisplayValues({ country: 'XX' });
    expect(values.country).toBe('XX');
  });

  it('carries organization and sorting code', async () => {
    const values = await resolveAddressDisplayValues({
      organization: 'ACME',
      sorting_code: 'CEDEX 9',
      country: 'US'
    });
    expect(values.O).toBe('ACME');
    expect(values.X).toBe('CEDEX 9');
  });
});

describe('formatAddressRow', () => {
  it('renders a US row with the runtime locale', async () => {
    const lines = await formatAddressRow(usRow);
    expect(lines).toEqual([
      'Jane Smith',
      '1600 Amphitheatre Pkwy',
      'Building 43',
      'Mountain View, California 94043',
      'United States'
    ]);
    expect(getLocale).toHaveBeenCalled();
    expect(selectFormat).toHaveBeenCalledWith(FORMATS.US, 'en');
    expect(resolveRegionName).toHaveBeenCalledWith('US', 'administrative_area', 'US-CA', 'en', []);
  });

  it('selects the latin layout for an English reader of an HK address', async () => {
    const row: AddressRow = {
      recipient: 'Chan Tai Man',
      address_line_1: '1 Nathan Road',
      locality: 'Yau Tsim Mong',
      administrative_area: 'Kowloon',
      country: 'HK'
    };
    expect(await formatAddressRow(row, 'en')).toEqual([
      'Chan Tai Man',
      '1 Nathan Road',
      'Yau Tsim Mong',
      'Kowloon',
      'Hong Kong'
    ]);
    expect(await formatAddressRow(row, 'zh-Hant')).toEqual([
      'Kowloon',
      'Yau Tsim Mong',
      '1 Nathan Road',
      'Chan Tai Man',
      'Hong Kong'
    ]);
    expect(getLocale).not.toHaveBeenCalled();
  });

  it('passes includeCountry through', async () => {
    const lines = await formatAddressRow(usRow, 'en', { includeCountry: false });
    expect(lines).not.toContain('United States');
    expect(lines).toHaveLength(4);
  });

  it('uses the DEFAULT record for a row without country', async () => {
    const lines = await formatAddressRow({ recipient: 'Jane', address_line_1: '1 Main', locality: 'Town' });
    expect(getAddressFormat).toHaveBeenCalledWith('');
    expect(lines).toEqual(['Jane', '1 Main', 'Town']);
  });
});
