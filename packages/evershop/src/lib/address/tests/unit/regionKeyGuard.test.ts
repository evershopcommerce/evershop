import fs from 'fs';
import path from 'path';
import { describe, it, expect } from '@jest/globals';
import { COUNTRIES } from '../../data/countries.js';
import { DEFAULT_REGIONS } from '../../data/regions.js';

/**
 * The append-only rule's first assertion (spec § 3.3 rule 2): every key of the
 * old `lib/locale/provinces.ts` exists in the generated `data/regions.ts` with
 * the same name, so every stored address, shipping zone and tax rate stays
 * resolvable. Vietnam is the one exception, governed by
 * `scripts/address-formats/fixes/VN.regions.json` (spec § 10 Q6): its keys
 * must still exist, active or retired, but their names follow the 2025 ruling.
 * The old files are gone (PR3); `scripts/address-formats/snapshot/legacy/locale-lists.json`
 * is their snapshot — the generator reads it for the same guard — and must never be edited.
 */
interface LegacyLists {
  countries: Array<{ code: string; name: string }>;
  provinces: Array<{ code: string; countryCode: string; name: string }>;
}

// Tests run from dist; the fixture is read from the source tree (repo root cwd).
const FIXTURE = path.resolve(
  process.cwd(),
  'scripts/address-formats/snapshot/legacy/locale-lists.json'
);
const legacy = JSON.parse(fs.readFileSync(FIXTURE, 'utf8')) as LegacyLists;

describe('append-only rule: the old lib/locale lists → lib/address/data', () => {
  it('every old province key exists in DEFAULT_REGIONS with the same name (VN: key exists)', () => {
    expect(legacy.provinces.length).toBeGreaterThan(3000);
    const offenders: string[] = [];
    for (const row of legacy.provinces) {
      const match = (DEFAULT_REGIONS[row.countryCode] || []).find((region) => region.key === row.code);
      if (!match) {
        offenders.push(`${row.code}: missing`);
      } else if (row.countryCode !== 'VN' && match.name !== row.name) {
        offenders.push(`${row.code}: "${match.name}" !== "${row.name}"`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('every old VN key is still present, and the retired ones name a successor', () => {
    const vn = DEFAULT_REGIONS.VN;
    for (const row of legacy.provinces.filter((province) => province.countryCode === 'VN')) {
      const match = vn.find((region) => region.key === row.code);
      expect(match).toBeDefined();
      if (match?.retired) expect(match.mergedInto).toBeDefined();
    }
  });

  it('every old country code exists in COUNTRIES with the same name', () => {
    const names = new Map(COUNTRIES.map((country) => [country.code, country.name]));
    const offenders = legacy.countries.filter((country) => names.get(country.code) !== country.name);
    expect(offenders).toEqual([]);
  });
});
