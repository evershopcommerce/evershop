import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from '@jest/globals';
import { COUNTRIES } from '../../data/countries.js';
import { DEFAULT_REGIONS } from '../../data/regions.js';
import { ADDRESS_FORMATS, DEFAULT_ADDRESS_FORMAT } from '../../formats/index.js';

/**
 * Pins what `scripts/address-formats/generate.mjs` must produce (plan PR1, "generatedData"):
 * the attribution headers on every generated file, the DEFAULT record, the record shape rules,
 * and the region facts the append-only rule and the Vietnam ruling (spec § 10 Q6) rest on.
 * Tests run from dist; the headers are comments, so they are read from the TypeScript sources.
 */
const SRC = path.resolve(process.cwd(), 'packages/evershop/src/lib/address');
const SNAPSHOT = path.resolve(process.cwd(), 'scripts/address-formats/snapshot');

/** Plan § 1.5, verbatim, up to the snapshot date. */
const HEADER_PREFIX = `/**
 * GENERATED FILE — do not edit by hand. Regenerate with \`npm run generate:address-formats\`.
 *
 * Address format data derived from Google's libaddressinput address metadata
 * (https://github.com/google/libaddressinput, served at
 * https://chromium-i18n.appspot.com/ssl-address/data), licensed under the
 * Creative Commons Attribution 4.0 International License (CC-BY 4.0,
 * https://creativecommons.org/licenses/by/4.0/). Changes made: converted from JSON to
 * TypeScript, keys normalized to EverShop's AddressFormat shape, manual corrections from
 * scripts/address-formats/fixes/ applied, EverShop extensions (address_lines, name_order,
 * telephone.dialCode) added. Snapshot: `;
const CLDR_NOTICE = 'Person-name order derived from Unicode CLDR';
const PHONE_NOTICE = "telephone.dialCode from Google's libphonenumber";

const readJson = (file: string) => JSON.parse(fs.readFileSync(file, 'utf8'));

function generatedFiles(dir: string): string[] {
  return fs
    .readdirSync(path.join(SRC, dir))
    .filter((name) => name.endsWith('.ts'))
    .sort()
    .map((name) => path.join(SRC, dir, name));
}

describe('generated address data: attribution headers', () => {
  const formats = generatedFiles('formats');
  const data = generatedFiles('data');

  it('every formats/ and data/ file opens with the CC-BY 4.0 header and a snapshot date', () => {
    expect(formats.length).toBe(254); // 252 countries + DEFAULT + index
    expect(data.map((file) => path.basename(file))).toEqual(['countries.ts', 'regions.ts']);
    const offenders: string[] = [];
    for (const file of [...formats, ...data]) {
      const source = fs.readFileSync(file, 'utf8');
      const dated = /^\d{4}-\d{2}-\d{2}\.\n \*\/\n/.test(source.slice(HEADER_PREFIX.length));
      if (!source.startsWith(HEADER_PREFIX) || !dated) offenders.push(path.relative(SRC, file));
    }
    expect(offenders).toEqual([]);
  });

  it('formats files carry the CLDR notice; files with a dialCode name libphonenumber', () => {
    const offenders: string[] = [];
    for (const file of formats) {
      const source = fs.readFileSync(file, 'utf8');
      if (!source.includes(CLDR_NOTICE)) offenders.push(`${path.basename(file)}: no CLDR notice`);
      if (source.includes('dialCode:') !== source.includes(PHONE_NOTICE)) {
        offenders.push(`${path.basename(file)}: dialCode and libphonenumber notice disagree`);
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe('ADDRESS_FORMATS', () => {
  const codes = Object.keys(ADDRESS_FORMATS);

  it('has one record per country of the snapshot (252), sorted, with ZZ published as DEFAULT only', () => {
    const root = readJson(path.join(SNAPSHOT, 'google', '_root.json')).countries.split('~');
    expect(codes).toHaveLength(252);
    expect(codes).toEqual([...root].sort());
    expect(ADDRESS_FORMATS.ZZ).toBeUndefined();
  });

  it('DEFAULT_ADDRESS_FORMAT equals the ZZ snapshot record', () => {
    const zz = readJson(path.join(SNAPSHOT, 'google', 'ZZ.json'));
    expect(DEFAULT_ADDRESS_FORMAT.fmt).toBe(zz.fmt);
    expect(DEFAULT_ADDRESS_FORMAT.require).toBe(zz.require);
    expect(DEFAULT_ADDRESS_FORMAT.fmt).toBe('%N%n%O%n%A%n%C');
    expect(DEFAULT_ADDRESS_FORMAT.require).toBe('AC');
  });

  it('every record has fmt and require, and none repeats fmt as lfmt', () => {
    const offenders = codes.filter((cc) => {
      const record = ADDRESS_FORMATS[cc];
      return !record.fmt || !record.require || record.lfmt === record.fmt;
    });
    expect(offenders).toEqual([]);
  });

  it('records without fmt or require upstream inherit the ZZ values', () => {
    const silent = codes.filter((cc) => {
      const upstream = readJson(path.join(SNAPSHOT, 'google', `${cc}.json`));
      return !upstream.fmt && !upstream.require;
    });
    expect(silent.length).toBeGreaterThan(0);
    for (const cc of silent) {
      expect(ADDRESS_FORMATS[cc].fmt).toBe(DEFAULT_ADDRESS_FORMAT.fmt);
      expect(ADDRESS_FORMATS[cc].require).toBe(DEFAULT_ADDRESS_FORMAT.require);
    }
  });

  it('derives name_order from CLDR: family_first for JP and VN, given_first for US and DE', () => {
    expect(ADDRESS_FORMATS.JP.name_order).toBe('family_first');
    expect(ADDRESS_FORMATS.VN.name_order).toBe('family_first');
    expect(ADDRESS_FORMATS.US.name_order).toBe('given_first');
    expect(ADDRESS_FORMATS.DE.name_order).toBe('given_first');
    expect(DEFAULT_ADDRESS_FORMAT.name_order).toBe('given_first');
  });

  it('carries the upstream name types and the bundled dial codes', () => {
    expect(ADDRESS_FORMATS.MY.sublocality_name_type).toBe('village_township');
    expect(ADDRESS_FORMATS.VN.telephone?.dialCode).toBe('+84');
    expect(ADDRESS_FORMATS.US.telephone?.dialCode).toBe('+1');
    expect(ADDRESS_FORMATS.AQ.telephone).toBeUndefined(); // no calling code for Antarctica
    expect(ADDRESS_FORMATS.HK.languages).toEqual(['zh-Hant', 'en']);
    expect(ADDRESS_FORMATS.JP.lfmt).toBe('%N%n%O%n%A, %S%n%Z');
  });

  it("carries Google's lang as a bare language subtag (zh-Hant → zh) on the 63 records that have one (62 upstream + Macau from fixes/MO.format.json)", () => {
    expect(ADDRESS_FORMATS.HK.lang).toBe('zh');
    expect(ADDRESS_FORMATS.TW.lang).toBe('zh');
    expect(ADDRESS_FORMATS.US.lang).toBe('en');
    expect(ADDRESS_FORMATS.DE.lang).toBeUndefined();
    expect(ADDRESS_FORMATS.MO.lang).toBe('zh');
    expect(ADDRESS_FORMATS.MO.languages).toEqual(['zh-Hant', 'pt']);
    expect(codes.filter((cc) => ADDRESS_FORMATS[cc].lang !== undefined)).toHaveLength(63);
  });

  it('never emits address_lines (the library defaults it)', () => {
    expect(codes.filter((cc) => ADDRESS_FORMATS[cc].address_lines !== undefined)).toEqual([]);
  });
});

describe('COUNTRIES', () => {
  it('is sorted by code, has unique codes and covers every format record', () => {
    const codes = COUNTRIES.map((country) => country.code);
    expect(codes).toEqual([...codes].sort());
    expect(new Set(codes).size).toBe(codes.length);
    expect(Object.keys(ADDRESS_FORMATS).filter((cc) => !codes.includes(cc))).toEqual([]);
    expect(COUNTRIES.find((country) => country.code === 'VN')?.name).toBe('Vietnam');
    expect(COUNTRIES.every((country) => country.name.length > 0)).toBe(true);
  });

  it('takes display names from fixes/countries.json for codes lib/locale does not name', () => {
    const name = (code: string) => COUNTRIES.find((country) => country.code === code)?.name;
    expect(name('BQ')).toBe('Bonaire, Sint Eustatius and Saba');
    expect(name('CW')).toBe('Curaçao');
    expect(name('TA')).toBe('Tristan da Cunha');
  });
});

describe('DEFAULT_REGIONS', () => {
  it('has no duplicate keys within a country, sorted lists, and never writes retired: false', () => {
    const offenders: string[] = [];
    for (const [cc, regions] of Object.entries(DEFAULT_REGIONS)) {
      const keys = regions.map((region) => region.key);
      if (new Set(keys).size !== keys.length) offenders.push(`${cc}: duplicate keys`);
      if (keys.join('\n') !== [...keys].sort().join('\n')) offenders.push(`${cc}: not sorted`);
      if (regions.some((region) => region.retired === false)) offenders.push(`${cc}: retired: false`);
      if (regions.some((region) => !region.key || !region.name)) offenders.push(`${cc}: empty key or name`);
    }
    expect(offenders).toEqual([]);
  });

  it('VN: 34 active provinces, 29 retired codes merged into active keys, Huế named officially', () => {
    const vn = DEFAULT_REGIONS.VN;
    const active = vn.filter((region) => !region.retired);
    const retired = vn.filter((region) => region.retired);
    expect(active).toHaveLength(34);
    expect(retired).toHaveLength(29);
    const activeKeys = new Set(active.map((region) => region.key));
    expect(retired.filter((region) => !region.mergedInto || !activeKeys.has(region.mergedInto))).toEqual([]);
    expect(active.find((region) => region.key === 'VN-26')?.name).toBe('Huế');
    expect(active.find((region) => region.key === 'VN-SG')?.name).toBe('Hồ Chí Minh');
    expect(retired.find((region) => region.key === 'VN-43')?.mergedInto).toBe('VN-SG');
  });

  it('HK: the three areas keyed by Google sub_keys, native names with the key as latinName', () => {
    expect(DEFAULT_REGIONS.HK.map((region) => region.key).sort()).toEqual(
      ['Hong Kong Island', 'Kowloon', 'New Territories'].sort()
    );
    const island = DEFAULT_REGIONS.HK.find((region) => region.key === 'Hong Kong Island');
    expect(island?.name).toBe('香港島');
    expect(island?.latinName).toBe('Hong Kong Island');
    expect(DEFAULT_REGIONS.HK.find((region) => region.key === 'Kowloon')?.latinName).toBe('Kowloon');
  });

  it('KY: keys equal to their names get no latinName', () => {
    expect(DEFAULT_REGIONS.KY).toHaveLength(3);
    expect(DEFAULT_REGIONS.KY.every((region) => region.key === region.name && region.latinName === undefined)).toBe(
      true
    );
  });

  it('US: ISO 3166-2 keys are preserved', () => {
    const california = DEFAULT_REGIONS.US.find((region) => region.key === 'US-CA');
    expect(california?.name).toBe('California');
    expect(california?.isoCode).toBe('US-CA');
  });
});
