import { beforeEach, describe, expect, it } from '@jest/globals';
import {
  __resetAddressFormatsForTests,
  getRegistryGeneration,
  lockAddressRegistry,
  patchAddressFormat
} from '../../formats.js';
import {
  __resetRegionProvidersForTests,
  getRegionLevels,
  getRegionProvider,
  getRegions,
  isActiveRegionKey,
  registerRegionProvider,
  resolveRegionName
} from '../../regions.js';
import { configureAddressRuntime, resetAddressRuntime } from '../../runtime.js';
import type { Region, RegionProvider } from '../../types.js';

/** Three enumerated levels, with a retired province and a retired city. */
const tree: Record<string, Region[]> = {
  '': [
    { key: 'P1', name: 'Province 1', latinName: 'Province One' },
    { key: 'P2', name: 'Province 2', retired: true, mergedInto: 'P1' }
  ],
  P1: [
    { key: 'P1-C1', name: 'City 1' },
    { key: 'P1-C2', name: 'Old City', retired: true, mergedInto: 'P1-C1' }
  ],
  'P1/P1-C1': [{ key: 'W1', name: 'Ward 1' }]
};

const threeLevels: RegionProvider = {
  levels: ['administrative_area', 'locality', 'dependent_locality'],
  list: (parentPath) => tree[parentPath.join('/')] ?? []
};

describe('lib/address region providers', () => {
  beforeEach(() => {
    __resetRegionProvidersForTests();
    __resetAddressFormatsForTests();
    resetAddressRuntime();
  });

  describe('default provider over the bundled data', () => {
    it('enumerates one administrative_area level where the data has entries', async () => {
      expect(getRegionLevels('US')).toEqual(['administrative_area']);
      const states = await getRegions('US', []);
      expect(states).toEqual(
        expect.arrayContaining([expect.objectContaining({ key: 'US-CA', name: 'California' })])
      );
      expect(await getRegions('US', ['US-CA'])).toEqual([]);
    });

    it('is free text everywhere for a country without entries', async () => {
      expect(getRegionLevels('QZ')).toEqual([]);
      expect(await getRegions('QZ', [])).toEqual([]);
      expect(await resolveRegionName('QZ', 'administrative_area', 'Anywhere')).toBe('Anywhere');
      expect(await isActiveRegionKey('QZ', 'administrative_area', 'Anywhere')).toBe(false);
    });

    it('resolves names and falls back to the key', async () => {
      expect(await resolveRegionName('US', 'administrative_area', 'US-CA')).toBe('California');
      expect(await resolveRegionName('US', 'administrative_area', 'US-XX')).toBe('US-XX');
      expect(await resolveRegionName('US', 'locality', 'Mountain View')).toBe('Mountain View');
      expect(await resolveRegionName('us', 'administrative_area', 'US-CA')).toBe('California');
    });

    it('keeps retired keys resolvable while hiding them from selection (VN 2025)', async () => {
      const active = await getRegions('VN', []);
      expect(active.some((r) => r.key === 'VN-28')).toBe(false);
      expect(active.some((r) => r.key === 'VN-HN')).toBe(true);
      expect(await resolveRegionName('VN', 'administrative_area', 'VN-28')).toBe('Kon Tum');
      expect(await isActiveRegionKey('VN', 'administrative_area', 'VN-28')).toBe(false);
      expect(await isActiveRegionKey('VN', 'administrative_area', 'VN-HN')).toBe(true);
    });

    it('returns copies, so callers may annotate regions', async () => {
      const [first] = await getRegions('US', []);
      first.name = 'MUTATED';
      const [again] = await getRegions('US', []);
      expect(again.name).not.toBe('MUTATED');
    });
  });

  describe('a registered hierarchical provider', () => {
    beforeEach(() => {
      registerRegionProvider('QZ', threeLevels);
    });

    it('replaces the default and reports its levels', () => {
      expect(getRegionProvider('QZ').levels).toEqual([
        'administrative_area',
        'locality',
        'dependent_locality'
      ]);
      expect(getRegionLevels('qz')).toEqual(getRegionLevels('QZ'));
    });

    it('lists children by parent path, active only', async () => {
      expect(await getRegions('QZ', [])).toEqual([
        { key: 'P1', name: 'Province 1', latinName: 'Province One' }
      ]);
      expect(await getRegions('QZ', ['P1'])).toEqual([{ key: 'P1-C1', name: 'City 1' }]);
      expect(await getRegions('QZ', ['P1', 'P1-C1'])).toEqual([{ key: 'W1', name: 'Ward 1' }]);
      expect(await getRegions('QZ', ['P1', 'P1-C1', 'W1'])).toEqual([]);
      expect(await getRegions('QZ', ['NOPE'])).toEqual([]);
    });

    it('resolves retired keys by name at every level', async () => {
      expect(await resolveRegionName('QZ', 'administrative_area', 'P2')).toBe('Province 2');
      expect(await resolveRegionName('QZ', 'locality', 'P1-C2', undefined, ['P1'])).toBe('Old City');
      expect(await resolveRegionName('QZ', 'dependent_locality', 'W1', 'en', ['P1', 'P1-C1'])).toBe('Ward 1');
    });

    it('falls back to the key when a deeper level has no parent path or nothing matches', async () => {
      expect(await resolveRegionName('QZ', 'locality', 'P1-C1')).toBe('P1-C1');
      expect(await resolveRegionName('QZ', 'locality', 'P1-C1', undefined, [])).toBe('P1-C1');
      expect(await resolveRegionName('QZ', 'locality', 'NOPE', undefined, ['P1'])).toBe('NOPE');
      expect(await resolveRegionName('QZ', 'administrative_area', 'NOPE')).toBe('NOPE');
    });

    it('isActiveRegionKey accepts active keys only, with the parents', async () => {
      expect(await isActiveRegionKey('QZ', 'administrative_area', 'P1')).toBe(true);
      expect(await isActiveRegionKey('QZ', 'administrative_area', 'P2')).toBe(false);
      expect(await isActiveRegionKey('QZ', 'locality', 'P1-C1', ['P1'])).toBe(true);
      expect(await isActiveRegionKey('QZ', 'locality', 'P1-C2', ['P1'])).toBe(false);
      expect(await isActiveRegionKey('QZ', 'locality', 'P1-C1')).toBe(false);
      expect(await isActiveRegionKey('QZ', 'dependent_locality', 'W1', ['P1', 'P1-C1'])).toBe(true);
    });

    it('awaits an asynchronous provider', async () => {
      registerRegionProvider('QY', {
        levels: ['administrative_area'],
        list: async () => [{ key: 'A', name: 'Async A' }, { key: 'B', name: 'Gone', retired: true }]
      });
      expect(await getRegions('QY', [])).toEqual([{ key: 'A', name: 'Async A' }]);
      expect(await resolveRegionName('QY', 'administrative_area', 'B')).toBe('Gone');
      expect(await isActiveRegionKey('QY', 'administrative_area', 'A')).toBe(true);
    });

    it('passes the locale through to the provider', async () => {
      const seen: (string | undefined)[] = [];
      registerRegionProvider('QY', {
        levels: ['administrative_area'],
        list: (_path, locale) => {
          seen.push(locale);
          return [{ key: 'A', name: locale === 'vi' ? 'Tiếng Việt' : 'English' }];
        }
      });
      expect((await getRegions('QY', [], 'vi'))[0].name).toBe('Tiếng Việt');
      expect(await resolveRegionName('QY', 'administrative_area', 'A', 'en')).toBe('English');
      expect(seen).toEqual(['vi', 'en']);
    });

    it('can turn an enumerated country into free text', async () => {
      registerRegionProvider('US', { levels: [], list: () => [] });
      expect(getRegionLevels('US')).toEqual([]);
      expect(await getRegions('US', [])).toEqual([]);
      expect(await resolveRegionName('US', 'administrative_area', 'US-CA')).toBe('US-CA');
    });
  });

  describe('display name by locale (name vs latinName)', () => {
    const hongKong: Region[] = [
      { key: 'Hong Kong Island', name: '香港島', latinName: 'Hong Kong Island' },
      { key: 'Kowloon', name: '九龍' }
    ];

    beforeEach(() => {
      registerRegionProvider('QH', { levels: ['administrative_area'], list: () => hongKong });
      // Google's HK record: names written in zh, but `en` is also a served language
      patchAddressFormat('QH', { lang: 'zh', languages: ['zh-Hant', 'en'] });
    });

    it('shows latinName to a reader outside the native language and name to a native reader', async () => {
      expect(await resolveRegionName('QH', 'administrative_area', 'Hong Kong Island', 'en')).toBe('Hong Kong Island');
      expect(await resolveRegionName('QH', 'administrative_area', 'Hong Kong Island', 'zh')).toBe('香港島');
      expect(await resolveRegionName('QH', 'administrative_area', 'Hong Kong Island', 'zh-TW')).toBe('香港島');
      expect(await resolveRegionName('QH', 'administrative_area', 'Hong Kong Island', 'fr')).toBe('Hong Kong Island');
    });

    it("`lang` wins over `languages`: 'en' listed as served still gets the latin name", async () => {
      registerRegionProvider('QY', { levels: ['administrative_area'], list: () => hongKong });
      patchAddressFormat('QY', { lang: 'zh', languages: ['en', 'zh-Hant'] });
      expect(await resolveRegionName('QY', 'administrative_area', 'Hong Kong Island', 'en')).toBe('Hong Kong Island');
      expect(await resolveRegionName('QY', 'administrative_area', 'Hong Kong Island', 'zh')).toBe('香港島');
    });

    it('falls back to languages[0] when the record has no lang', async () => {
      registerRegionProvider('QY', { levels: ['administrative_area'], list: () => hongKong });
      patchAddressFormat('QY', { languages: ['zh-Hant', 'en'] });
      expect(await resolveRegionName('QY', 'administrative_area', 'Hong Kong Island', 'zh')).toBe('香港島');
      expect(await resolveRegionName('QY', 'administrative_area', 'Hong Kong Island', 'en')).toBe('Hong Kong Island');
    });

    it('falls back to name when the region has no latinName, whatever the locale', async () => {
      expect(await resolveRegionName('QH', 'administrative_area', 'Kowloon', 'en')).toBe('九龍');
      expect(await resolveRegionName('QH', 'administrative_area', 'Kowloon', 'zh')).toBe('九龍');
    });

    it('treats a record with neither lang nor languages as non-native for every locale', async () => {
      registerRegionProvider('QY', { levels: ['administrative_area'], list: () => hongKong });
      expect(await resolveRegionName('QY', 'administrative_area', 'Hong Kong Island', 'zh')).toBe('Hong Kong Island');
      expect(await resolveRegionName('QY', 'administrative_area', 'Hong Kong Island', 'en')).toBe('Hong Kong Island');
    });

    it('uses the runtime locale when none is requested', async () => {
      expect(await resolveRegionName('QH', 'administrative_area', 'Hong Kong Island')).toBe('Hong Kong Island'); // default 'en'
      configureAddressRuntime({ getLocale: () => 'zh-Hant' });
      expect(await resolveRegionName('QH', 'administrative_area', 'Hong Kong Island')).toBe('香港島');
    });

    it('getRegions keeps both names so the client can choose', async () => {
      expect(await getRegions('QH', [], 'en')).toEqual(hongKong);
    });

    it('applies to the bundled data: Vietnamese names for vi, latin names otherwise', async () => {
      expect(await resolveRegionName('VN', 'administrative_area', 'VN-HN', 'vi')).toBe('Hà Nội');
      expect(await resolveRegionName('VN', 'administrative_area', 'VN-HN', 'en')).toBe('Ha Noi');
    });
  });

  describe('registration rules', () => {
    it('bumps the registry generation', () => {
      const start = getRegistryGeneration();
      registerRegionProvider('QZ', threeLevels);
      expect(getRegistryGeneration()).toBe(start + 1);
    });

    it('validates the provider shape', () => {
      expect(() => registerRegionProvider('', threeLevels)).toThrow(/country code/);
      expect(() =>
        registerRegionProvider('QZ', { levels: [] } as unknown as RegionProvider)
      ).toThrow(/'levels' and 'list'/);
    });

    it('throws after the lock with the carrier-registry message shape', () => {
      lockAddressRegistry();
      expect(() => registerRegionProvider('VN', threeLevels)).toThrow(
        "Cannot register region provider for 'VN' after bootstrap. Call registerRegionProvider from your extension's bootstrap.ts."
      );
      expect(getRegionLevels('VN')).toEqual(['administrative_area']);
    });

    it('__resetRegionProvidersForTests restores the defaults', () => {
      registerRegionProvider('US', { levels: [], list: () => [] });
      __resetRegionProvidersForTests();
      expect(getRegionLevels('US')).toEqual(['administrative_area']);
    });
  });
});
