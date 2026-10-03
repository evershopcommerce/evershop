import { beforeEach, describe, expect, it } from '@jest/globals';
import { deriveAddressSchema, selectFormat } from '../../derive.js';
import { __resetAddressFormatsForTests, getAddressFormat, patchAddressFormat } from '../../formats.js';
import { CORE_TELEPHONE_PATTERN } from '../../tokens.js';
import type { AddressFormat, AddressLevel, ExtraFieldDefinition, ResolvedAddressSchema } from '../../types.js';
import { byId, CN, DE, HK, ids, JP, onRow, rowOf, rows, US, VN, VN_WARD_PATCH, ZZ } from './addressFixtures.js';

const INVALID = '${field} is not valid';
const one = ['administrative_area'] as const;

function derive(
  country: string,
  record: AddressFormat,
  locale = 'en',
  regionLevels: readonly AddressLevel[] = one
): ResolvedAddressSchema {
  return deriveAddressSchema({ country, record, locale, regionLevels: [...regionLevels] });
}

/** Invariants every schema must hold (spec § 3.4, D-19). */
function expectInvariants(schema: ResolvedAddressSchema) {
  expect(schema.fields[0]).toEqual({ id: 'country', type: 'select', labelType: 'country', required: true, row: 0 });
  expect(onRow(schema, 0)).toEqual(['country']);
  const telephone = byId(schema, 'telephone');
  expect(onRow(schema, telephone.row)).toEqual(['telephone']);
  if (ids(schema).includes('recipient')) {
    expect(telephone.row).toBe(rowOf(schema, 'recipient') + 1);
  } else {
    expect(telephone.row).toBe(1);
  }
  // rows are dense and non-decreasing in display order
  const seen = rows(schema);
  expect(new Set(seen).size).toBe(Math.max(...seen) + 1);
  for (let i = 1; i < seen.length; i += 1) {
    expect(seen[i]).toBeGreaterThanOrEqual(seen[i - 1]);
  }
}

describe('lib/address derive', () => {
  beforeEach(() => {
    __resetAddressFormatsForTests();
  });

  describe('selectFormat', () => {
    it('uses fmt when the record has no language data, no lfmt, or an lfmt equal to fmt', () => {
      expect(selectFormat(DE, 'ja')).toEqual({ format: DE.fmt, script: 'native' });
      expect(selectFormat({ ...JP, languages: undefined, lang: undefined }, 'en')).toEqual({ format: JP.fmt, script: 'native' });
      expect(selectFormat({ ...VN, lfmt: VN.fmt }, 'en')).toEqual({ format: VN.fmt, script: 'native' });
    });

    it("uses lfmt when the locale's language is not the one the native layout is written in", () => {
      expect(selectFormat(JP, 'en')).toEqual({ format: JP.lfmt, script: 'latin' });
      expect(selectFormat(JP, 'ja')).toEqual({ format: JP.fmt, script: 'native' });
      expect(selectFormat(JP, 'ja-JP')).toEqual({ format: JP.fmt, script: 'native' });
      expect(selectFormat(JP, 'ja_JP')).toEqual({ format: JP.fmt, script: 'native' });
    });

    it('compares base languages on both sides, keyed on `lang` (fallback languages[0]), not on membership in `languages`', () => {
      expect(selectFormat(HK, 'zh-TW').script).toBe('native'); // zh-Hant vs zh-TW
      expect(selectFormat(HK, 'zh').script).toBe('native');
      // `en` is an official language of Hong Kong and listed in `languages`, but the
      // native layout is Chinese: an English reader gets the Latin layout (2026-10-02).
      expect(selectFormat(HK, 'en-GB').script).toBe('latin');
      expect(selectFormat({ ...HK, lang: undefined }, 'en').script).toBe('latin'); // languages[0] = zh-Hant
      expect(selectFormat(HK, 'fr').script).toBe('latin');
      expect(selectFormat(CN, 'zh-Hans').script).toBe('native');
      expect(selectFormat(CN, 'en').script).toBe('latin');
    });
  });

  describe('US', () => {
    const schema = derive('US', US);

    it('orders fields recipient → telephone → organization → address lines → city/state/ZIP on one row', () => {
      expectInvariants(schema);
      expect(ids(schema)).toEqual([
        'country', 'recipient', 'telephone', 'organization',
        'address_line_1', 'address_line_2', 'locality', 'administrative_area', 'postal_code'
      ]);
      expect(rows(schema)).toEqual([0, 1, 2, 3, 4, 4, 5, 5, 5]);
    });

    it('derives requiredness, types and labels from the record', () => {
      expect(byId(schema, 'recipient')).toEqual({ id: 'recipient', token: 'N', type: 'text', labelType: 'recipient', required: true, row: 1 });
      expect(byId(schema, 'organization')).toEqual({ id: 'organization', token: 'O', type: 'text', labelType: 'organization', required: false, row: 3 });
      expect(byId(schema, 'address_line_1')).toEqual({ id: 'address_line_1', token: 'A', type: 'text', labelType: 'address_line', required: true, row: 4 });
      expect(byId(schema, 'address_line_2')).toEqual({ id: 'address_line_2', token: 'A', type: 'text', labelType: 'address_line_2', required: false, row: 4 });
      expect(byId(schema, 'locality')).toEqual({ id: 'locality', token: 'C', type: 'text', labelType: 'city', required: true, row: 5 });
      expect(byId(schema, 'administrative_area')).toEqual({
        id: 'administrative_area', token: 'S', type: 'select', labelType: 'state', required: true, optionSource: 'regions', row: 5
      });
      expect(byId(schema, 'administrative_area').dependsOn).toBeUndefined();
    });

    it('anchors the ZIP pattern and takes the placeholder from the first example', () => {
      const zip = byId(schema, 'postal_code');
      expect(zip).toEqual({
        id: 'postal_code', token: 'Z', type: 'text', labelType: 'zip', required: true, row: 5,
        pattern: { regex: '^(?:(\\d{5})(?:[ \\-](\\d{4}))?)$', messageKey: INVALID },
        placeholder: '95014'
      });
      const re = new RegExp(zip.pattern!.regex);
      expect(re.test('95014')).toBe(true);
      expect(re.test('22162-1010')).toBe(true);
      expect(re.test('9501')).toBe(false);
      expect(re.test('95014x')).toBe(false);
    });

    it('adds telephone with the core rule on its own row after the recipient', () => {
      expect(byId(schema, 'telephone')).toEqual({
        id: 'telephone', type: 'tel', labelType: 'telephone', required: true, row: 2,
        pattern: { regex: CORE_TELEPHONE_PATTERN, messageKey: INVALID }
      });
      const re = new RegExp(CORE_TELEPHONE_PATTERN);
      expect(re.test('+84 912 345 678')).toBe(true);
      expect(re.test('abc')).toBe(false);
    });

    it('carries the schema-level facts', () => {
      expect(schema.country).toBe('US');
      expect(schema.locale).toBe('en');
      expect(schema.script).toBe('native');
      expect(schema.format).toBe(US.fmt);
      expect(schema.nameOrder).toBe('given_first');
      expect(schema.upper).toEqual(['C', 'S']);
    });

    it('makes the state free text when the provider enumerates nothing', () => {
      const free = derive('US', US, 'en', []);
      expect(byId(free, 'administrative_area').type).toBe('text');
      expect(byId(free, 'administrative_area').optionSource).toBeUndefined();
    });
  });

  describe('DE', () => {
    const schema = derive('DE', DE);

    it('has no administrative area and puts %Z %C on one row, postcode first', () => {
      expectInvariants(schema);
      expect(ids(schema)).toEqual([
        'country', 'recipient', 'telephone', 'organization', 'address_line_1', 'address_line_2', 'postal_code', 'locality'
      ]);
      expect(onRow(schema, 5)).toEqual(['postal_code', 'locality']);
      expect(byId(schema, 'postal_code')).toMatchObject({
        labelType: 'postal', required: true, placeholder: '26133',
        pattern: { regex: '^(?:\\d{5})$', messageKey: INVALID }
      });
      expect(byId(schema, 'locality')).toMatchObject({ labelType: 'city', required: true, type: 'text' });
      expect(schema.upper).toEqual(['C']);
    });
  });

  describe('HK', () => {
    it('for a Chinese reader keeps the native layout: area first, name last', () => {
      const schema = derive('HK', HK, 'zh-HK');
      expectInvariants(schema);
      expect(schema.script).toBe('native');
      expect(ids(schema)).toEqual([
        'country', 'administrative_area', 'locality', 'address_line_1', 'address_line_2', 'organization', 'recipient', 'telephone'
      ]);
      expect(rows(schema)).toEqual([0, 1, 2, 3, 3, 4, 5, 6]);
    });

    it('for an English reader uses the Latin layout (name first) with the same fields: area select, district optional, no postal code', () => {
      const schema = derive('HK', HK, 'en');
      expectInvariants(schema);
      expect(schema.script).toBe('latin');
      expect(schema.format).toBe(HK.lfmt);
      expect(ids(schema)).toEqual([
        'country', 'recipient', 'telephone', 'organization', 'address_line_1', 'address_line_2', 'locality', 'administrative_area'
      ]);
      expect(rows(schema)).toEqual([0, 1, 2, 3, 4, 4, 5, 6]);
      expect(byId(schema, 'administrative_area')).toMatchObject({ type: 'select', labelType: 'area', required: true, optionSource: 'regions' });
      expect(byId(schema, 'locality')).toMatchObject({ type: 'text', labelType: 'district', required: false });
      expect(ids(schema)).not.toContain('postal_code');
      expect(schema.upper).toEqual(['S']);
      expect(schema.nameOrder).toBe('family_first');
    });

    it('for a French reader switches to lfmt: recipient first', () => {
      const schema = derive('HK', HK, 'fr');
      expectInvariants(schema);
      expect(schema.script).toBe('latin');
      expect(schema.format).toBe(HK.lfmt);
      expect(ids(schema).slice(0, 3)).toEqual(['country', 'recipient', 'telephone']);
      expect(ids(schema).slice(-1)).toEqual(['administrative_area']);
    });
  });

  describe('JP', () => {
    it("native layout for 'ja': postcode first, recipient last, telephone after it", () => {
      const schema = derive('JP', JP, 'ja');
      expectInvariants(schema);
      expect(schema.script).toBe('native');
      expect(schema.format).toBe(JP.fmt);
      expect(ids(schema)).toEqual([
        'country', 'postal_code', 'administrative_area', 'address_line_1', 'address_line_2', 'organization', 'recipient', 'telephone'
      ]);
      expect(rows(schema)).toEqual([0, 1, 2, 3, 3, 4, 5, 6]);
    });

    it("lfmt for 'en': recipient first, address lines share a row with the prefecture", () => {
      const schema = derive('JP', JP, 'en');
      expectInvariants(schema);
      expect(schema.script).toBe('latin');
      expect(schema.format).toBe(JP.lfmt);
      expect(ids(schema)).toEqual([
        'country', 'recipient', 'telephone', 'organization', 'address_line_1', 'address_line_2', 'administrative_area', 'postal_code'
      ]);
      expect(rows(schema)).toEqual([0, 1, 2, 3, 4, 4, 4, 5]);
      expect(byId(schema, 'administrative_area')).toMatchObject({ type: 'select', labelType: 'prefecture', required: true });
      expect(byId(schema, 'postal_code')).toMatchObject({
        labelType: 'postal', required: true, placeholder: '154-0023',
        pattern: { regex: '^(?:\\d{3}-?\\d{4})$', messageKey: INVALID }
      });
      expect(schema.nameOrder).toBe('family_first');
    });
  });

  describe('VN after the reference patch', () => {
    it('collects a ward (dependent_locality) and ends with the province', () => {
      // a user-assigned code, so the test does not depend on the bundled VN record
      patchAddressFormat('QV', VN);
      patchAddressFormat('QV', VN_WARD_PATCH);
      const record = getAddressFormat('QV');
      const schema = derive('QV', record, 'vi');
      expectInvariants(schema);
      expect(ids(schema)).toEqual([
        'country', 'recipient', 'telephone', 'organization', 'address_line_1', 'address_line_2',
        'dependent_locality', 'locality', 'administrative_area'
      ]);
      expect(byId(schema, 'dependent_locality')).toMatchObject({ token: 'D', type: 'text', labelType: 'ward', required: true });
      expect(byId(schema, 'locality')).toMatchObject({ labelType: 'city', required: true }); // C ∈ 'ACDS'
      expect(byId(schema, 'administrative_area')).toMatchObject({ type: 'select', labelType: 'province', required: true });
      expect(ids(schema)).not.toContain('postal_code');
      expect(byId(schema, 'telephone')).toMatchObject({
        pattern: { regex: '^(\\+84|0)[0-9]{9}$', messageKey: INVALID },
        placeholder: '0912 345 678'
      });
      expect(schema.nameOrder).toBe('family_first');
    });
  });

  describe('CN with three enumerated levels (test provider levels)', () => {
    const all = ['administrative_area', 'locality', 'dependent_locality'] as const;

    it("chains dependsOn district → city → province for 'en' (lfmt)", () => {
      const schema = derive('CN', CN, 'en', [...all]);
      expectInvariants(schema);
      expect(schema.script).toBe('latin');
      expect(ids(schema)).toEqual([
        'country', 'recipient', 'telephone', 'organization', 'address_line_1', 'address_line_2',
        'dependent_locality', 'locality', 'administrative_area', 'postal_code'
      ]);
      expect(byId(schema, 'dependent_locality')).toMatchObject({
        type: 'select', optionSource: 'regions', dependsOn: 'locality', labelType: 'district', required: false
      });
      expect(byId(schema, 'locality')).toMatchObject({
        type: 'select', optionSource: 'regions', dependsOn: 'administrative_area', labelType: 'city', required: true
      });
      expect(byId(schema, 'administrative_area')).toMatchObject({ type: 'select', optionSource: 'regions', labelType: 'province', required: true });
      expect(byId(schema, 'administrative_area').dependsOn).toBeUndefined();
      expect(onRow(schema, rowOf(schema, 'administrative_area'))).toEqual(['administrative_area', 'postal_code']);
    });

    it("native layout for 'zh': postcode first, then province/city/district on one row", () => {
      const schema = derive('CN', CN, 'zh', [...all]);
      expectInvariants(schema);
      expect(ids(schema).slice(0, 5)).toEqual(['country', 'postal_code', 'administrative_area', 'locality', 'dependent_locality']);
      expect(onRow(schema, 2)).toEqual(['administrative_area', 'locality', 'dependent_locality']);
    });

    it('skips a level the provider does not enumerate when chaining', () => {
      const schema = derive('CN', CN, 'en', ['administrative_area', 'dependent_locality']);
      expect(byId(schema, 'locality').type).toBe('text');
      expect(byId(schema, 'locality').dependsOn).toBeUndefined();
      expect(byId(schema, 'dependent_locality')).toMatchObject({ type: 'select', dependsOn: 'administrative_area' });
    });
  });

  describe('DEFAULT and edge formats', () => {
    it('an unknown code derives the DEFAULT fields', () => {
      const schema = derive('QX', ZZ, 'en', []);
      expectInvariants(schema);
      expect(schema.country).toBe('QX');
      expect(ids(schema)).toEqual(['country', 'recipient', 'telephone', 'organization', 'address_line_1', 'address_line_2', 'locality']);
      expect(byId(schema, 'locality')).toMatchObject({ type: 'text', labelType: 'city', required: true });
      expect(schema.upper).toEqual(['C']);
      expect(schema.nameOrder).toBe('given_first');
    });

    it('without %N the telephone goes directly after the country', () => {
      const schema = derive('QX', { ...ZZ, fmt: '%A%n%C' }, 'en', []);
      expectInvariants(schema);
      expect(ids(schema)).toEqual(['country', 'telephone', 'address_line_1', 'address_line_2', 'locality']);
      expect(rows(schema)).toEqual([0, 1, 2, 2, 3]);
    });

    it('%A expands to address_lines inputs (2 by default)', () => {
      expect(ids(derive('QX', ZZ, 'en', [])).filter((id) => id.startsWith('address_line_'))).toEqual(['address_line_1', 'address_line_2']);
      const three = derive('QX', { ...ZZ, address_lines: 3 }, 'en', []);
      expect(three.fields.filter((f) => f.token === 'A').map((f) => [f.id, f.labelType, f.required, f.row])).toEqual([
        ['address_line_1', 'address_line', true, 4],
        ['address_line_2', 'address_line_2', false, 4],
        ['address_line_3', 'address_line_3', false, 4]
      ]);
      expect(ids(derive('QX', { ...ZZ, address_lines: 1 }, 'en', [])).filter((id) => id.startsWith('address_line_'))).toEqual(['address_line_1']);
    });

    it('emits only tokens present in the format, each once, and %X as sorting_code', () => {
      const schema = derive('QX', { ...ZZ, fmt: '%N%n%A%n%C %X%n%C', require: 'ACX' }, 'en', []);
      expect(ids(schema)).toEqual(['country', 'recipient', 'telephone', 'address_line_1', 'address_line_2', 'locality', 'sorting_code']);
      expect(byId(schema, 'sorting_code')).toMatchObject({ token: 'X', labelType: 'sorting_code', required: true });
      expect(ids(schema)).not.toContain('organization');
    });

    it('drops empty lines, tolerates a missing upper and defaults the name order', () => {
      const schema = derive('QX', { fmt: '%N%n%n%A%n%C', require: 'AC' }, 'en', []);
      expect(rows(schema)).toEqual([0, 1, 2, 3, 3, 4]);
      expect(schema.upper).toEqual([]);
      expect(schema.nameOrder).toBe('given_first');
      expect(byId(schema, 'locality').labelType).toBe('city');
    });

    it('is pure: equal output for equal input and the record is not mutated', () => {
      const record = { ...US, telephone: { ...US.telephone } };
      const snapshot = JSON.parse(JSON.stringify(record));
      const a = derive('US', record);
      const b = derive('US', record);
      expect(a).toEqual(b);
      expect(a).not.toBe(b);
      expect(record).toEqual(snapshot);
    });
  });

  describe('extras', () => {
    const taxId: ExtraFieldDefinition = {
      id: 'tax_id', type: 'text', label: 'Tax ID', pattern: { regex: '^[0-9]{10,13}$', messageKey: 'Invalid tax ID' },
      placeholder: '0123456789', after: 'organization'
    };
    const note: ExtraFieldDefinition = { id: 'note', type: 'textarea', label: 'Delivery note' };

    it('an anchored extra gets its own row right after its anchor, later rows renumber', () => {
      const schema = deriveAddressSchema({ country: 'US', record: US, locale: 'en', regionLevels: [...one], extras: [taxId] });
      expectInvariants(schema);
      expect(ids(schema)).toEqual([
        'country', 'recipient', 'telephone', 'organization', 'tax_id',
        'address_line_1', 'address_line_2', 'locality', 'administrative_area', 'postal_code'
      ]);
      expect(rows(schema)).toEqual([0, 1, 2, 3, 4, 5, 5, 6, 6, 6]);
      expect(byId(schema, 'tax_id')).toEqual({
        id: 'tax_id', type: 'text', labelType: 'extra', label: 'Tax ID', required: false, row: 4,
        pattern: { regex: '^[0-9]{10,13}$', messageKey: 'Invalid tax ID' }, placeholder: '0123456789'
      });
      expect(byId(schema, 'tax_id').pattern).not.toBe(taxId.pattern);
    });

    it('an unanchored extra gets its own row after the last record row; several keep registration order', () => {
      const other: ExtraFieldDefinition = { id: 'other', type: 'text', label: 'Other', required: true };
      const schema = deriveAddressSchema({ country: 'US', record: US, locale: 'en', regionLevels: [...one], extras: [note, other] });
      expectInvariants(schema);
      expect(ids(schema).slice(-2)).toEqual(['note', 'other']);
      expect(rows(schema).slice(-3)).toEqual([5, 6, 7]);
      expect(byId(schema, 'other').required).toBe(true);
    });

    it('goes after the telephone row when the recipient is the last record row (JP native)', () => {
      const schema = deriveAddressSchema({ country: 'JP', record: JP, locale: 'ja', regionLevels: [...one], extras: [note] });
      expectInvariants(schema);
      expect(ids(schema).slice(-3)).toEqual(['recipient', 'telephone', 'note']);
    });

    it('two extras on one anchor keep registration order; a missing anchor falls back to the end', () => {
      const second: ExtraFieldDefinition = { id: 'vat_id', type: 'text', label: 'VAT', after: 'organization' };
      const orphan: ExtraFieldDefinition = { id: 'orphan', type: 'text', label: 'Orphan', after: 'sorting_code' };
      const schema = deriveAddressSchema({ country: 'US', record: US, locale: 'en', regionLevels: [...one], extras: [orphan, taxId, second, note] });
      expectInvariants(schema);
      expect(ids(schema)).toEqual([
        'country', 'recipient', 'telephone', 'organization', 'tax_id', 'vat_id',
        'address_line_1', 'address_line_2', 'locality', 'administrative_area', 'postal_code', 'orphan', 'note'
      ]);
      expect(rows(schema)).toEqual([0, 1, 2, 3, 4, 5, 6, 6, 7, 7, 7, 8, 9]);
    });

    it('an extra may anchor on an earlier extra', () => {
      const chained: ExtraFieldDefinition = { id: 'chained', type: 'text', label: 'Chained', after: 'tax_id' };
      const schema = deriveAddressSchema({ country: 'US', record: US, locale: 'en', regionLevels: [...one], extras: [taxId, chained] });
      expect(ids(schema).slice(3, 6)).toEqual(['organization', 'tax_id', 'chained']);
    });
  });
});
