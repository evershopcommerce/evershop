import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { deriveAddressSchema } from '../../derive.js';
import {
  ADDRESS_SETTINGS_DEFAULTS,
  applyAddressSettings,
  isCountryAllowed,
  normalizeAddressSettings,
  resolveDefaultCountry,
  resolveSellToCountries
} from '../../settings.js';
import type { AddressSettings, ResolvedAddressSchema } from '../../types.js';
import { byId, ids, onRow, rowOf, rows, US, VN, ZZ } from './addressFixtures.js';

const defaults = (): AddressSettings => ({ ...ADDRESS_SETTINGS_DEFAULTS, required: {} });
const usSchema = (): ResolvedAddressSchema =>
  deriveAddressSchema({ country: 'US', record: US, locale: 'en', regionLevels: ['administrative_area'] });

describe('lib/address settings', () => {
  describe('ADDRESS_SETTINGS_DEFAULTS', () => {
    it('are the eight code defaults', () => {
      expect(ADDRESS_SETTINGS_DEFAULTS).toEqual({
        nameFormat: 'single',
        telephone: 'required',
        organization: 'optional',
        addressLine2: 'shown',
        addressLine3: 'disabled',
        required: {},
        defaultCountry: 'store',
        sellToCountries: 'all'
      });
      expect(Object.isFrozen(ADDRESS_SETTINGS_DEFAULTS)).toBe(true);
    });
  });

  describe('normalizeAddressSettings', () => {
    let warn: ReturnType<typeof jest.spyOn>;
    beforeEach(() => {
      warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    });
    afterEach(() => {
      warn.mockRestore();
    });

    it('fills absent values with the defaults silently', () => {
      expect(normalizeAddressSettings({})).toEqual(ADDRESS_SETTINGS_DEFAULTS);
      expect(normalizeAddressSettings({ telephone: null, required: undefined })).toEqual(ADDRESS_SETTINGS_DEFAULTS);
      expect(warn).not.toHaveBeenCalled();
    });

    it('keeps valid values', () => {
      const settings = normalizeAddressSettings({
        nameFormat: 'split',
        telephone: 'hidden',
        organization: 'required',
        addressLine2: 'hidden',
        addressLine3: 'enabled',
        required: { postal_code: 'required', locality: 'asCountry' },
        defaultCountry: 'vn',
        sellToCountries: ['vn', 'us', 'VN']
      });
      expect(settings).toEqual({
        nameFormat: 'split',
        telephone: 'hidden',
        organization: 'required',
        addressLine2: 'hidden',
        addressLine3: 'enabled',
        required: { postal_code: 'required', locality: 'asCountry' },
        defaultCountry: 'VN',
        sellToCountries: ['VN', 'US']
      });
      expect(normalizeAddressSettings({ defaultCountry: 'none' }).defaultCountry).toBe('none');
      expect(normalizeAddressSettings({ defaultCountry: 'store' }).defaultCountry).toBe('store');
      expect(normalizeAddressSettings({ sellToCountries: 'all' }).sellToCountries).toBe('all');
      expect(normalizeAddressSettings({ sellToCountries: [] }).sellToCountries).toEqual([]);
      expect(warn).not.toHaveBeenCalled();
    });

    it('falls back to the default for unknown or malformed values, warning once per bad value', () => {
      const settings = normalizeAddressSettings({
        nameFormat: 'bogus',
        telephone: 42,
        organization: 'Required',
        required: 'nope',
        defaultCountry: 'XYZ',
        sellToCountries: { not: 'a list' }
      });
      expect(settings).toEqual(ADDRESS_SETTINGS_DEFAULTS);
      expect(warn).toHaveBeenCalledTimes(6);
      expect(String(warn.mock.calls[0][0])).toMatch(/nameFormat/);
    });

    it('drops junk entries from `required` and `sellToCountries`', () => {
      const settings = normalizeAddressSettings({
        required: { postal_code: 'required', bogus: 'required', telephone: 'optional', locality: 'asCountry' },
        sellToCountries: ['vn', 'xyz', 7, 'US']
      });
      expect(settings.required).toEqual({ postal_code: 'required', locality: 'asCountry' });
      expect(settings.sellToCountries).toEqual(['VN', 'US']);
      expect(warn).toHaveBeenCalledTimes(2);
    });

    it('treats a list with no valid code as malformed', () => {
      expect(normalizeAddressSettings({ sellToCountries: ['??', 'nope'] }).sellToCountries).toBe('all');
      expect(warn).toHaveBeenCalledTimes(1);
    });

    it('accepts the JSON string form of the two JSON rows', () => {
      const settings = normalizeAddressSettings({
        required: '{"postal_code":"required"}',
        sellToCountries: '["vn","us"]'
      });
      expect(settings.required).toEqual({ postal_code: 'required' });
      expect(settings.sellToCountries).toEqual(['VN', 'US']);
      expect(normalizeAddressSettings({ required: '{broken' }).required).toEqual({});
      expect(warn).toHaveBeenCalledTimes(1);
    });
  });

  describe('applyAddressSettings', () => {
    it('with the defaults keeps the schema and returns a new object', () => {
      const input = usSchema();
      const output = applyAddressSettings(input, defaults());
      expect(output).toEqual(input);
      expect(output).not.toBe(input);
      expect(output.fields[0]).not.toBe(input.fields[0]);
      expect(byId(output, 'postal_code').pattern).not.toBe(byId(input, 'postal_code').pattern);
    });

    it('does not mutate its input', () => {
      const input = usSchema();
      const snapshot = JSON.parse(JSON.stringify(input));
      applyAddressSettings(input, { ...defaults(), nameFormat: 'split', telephone: 'hidden', organization: 'hidden', required: { address_line_2: 'required' } });
      expect(input).toEqual(snapshot);
    });

    it("nameFormat 'split' emits given_name then family_name on the recipient row, no recipient", () => {
      const output = applyAddressSettings(usSchema(), { ...defaults(), nameFormat: 'split' });
      expect(ids(output)).toEqual([
        'country', 'given_name', 'family_name', 'telephone', 'organization',
        'address_line_1', 'address_line_2', 'locality', 'administrative_area', 'postal_code'
      ]);
      expect(onRow(output, 1)).toEqual(['given_name', 'family_name']);
      expect(byId(output, 'given_name')).toEqual({ id: 'given_name', type: 'text', labelType: 'given_name', required: true, row: 1 });
      expect(byId(output, 'family_name')).toEqual({ id: 'family_name', type: 'text', labelType: 'family_name', required: true, row: 1 });
      expect(rowOf(output, 'telephone')).toBe(2);
    });

    it("nameFormat 'split' puts family_name first for a family_first record", () => {
      const vn = deriveAddressSchema({ country: 'VN', record: VN, locale: 'vi', regionLevels: ['administrative_area'] });
      const output = applyAddressSettings(vn, { ...defaults(), nameFormat: 'split' });
      expect(onRow(output, 1)).toEqual(['family_name', 'given_name']);
      expect(ids(output)).not.toContain('recipient');
    });

    it("nameFormat 'split' adds nothing when the schema has no recipient", () => {
      const input = usSchema();
      input.fields = input.fields.filter((f) => f.id !== 'recipient');
      const output = applyAddressSettings(input, { ...defaults(), nameFormat: 'split' });
      expect(ids(output)).not.toContain('given_name');
      expect(ids(output)).not.toContain('family_name');
    });

    it("telephone 'hidden' removes the field and renumbers rows densely", () => {
      const output = applyAddressSettings(usSchema(), { ...defaults(), telephone: 'hidden' });
      expect(ids(output)).not.toContain('telephone');
      expect(rows(output)).toEqual([0, 1, 2, 3, 3, 4, 4, 4]);
      expect(rowOf(output, 'country')).toBe(0);
    });

    it("telephone 'optional' and 'required' set the flag", () => {
      expect(byId(applyAddressSettings(usSchema(), { ...defaults(), telephone: 'optional' }), 'telephone').required).toBe(false);
      expect(byId(applyAddressSettings(usSchema(), { ...defaults(), telephone: 'required' }), 'telephone').required).toBe(true);
    });

    it('organization follows its setting only when the record shows %O', () => {
      expect(ids(applyAddressSettings(usSchema(), { ...defaults(), organization: 'hidden' }))).not.toContain('organization');
      expect(byId(applyAddressSettings(usSchema(), { ...defaults(), organization: 'required' }), 'organization').required).toBe(true);
      expect(byId(applyAddressSettings(usSchema(), { ...defaults(), organization: 'optional' }), 'organization').required).toBe(false);

      const noOrg = deriveAddressSchema({ country: 'XX', record: { ...ZZ, fmt: '%N%n%A%n%C' }, locale: 'en', regionLevels: [] });
      const output = applyAddressSettings(noOrg, { ...defaults(), organization: 'required' });
      expect(ids(output)).not.toContain('organization');
    });

    it("addressLine2 'hidden' removes lines 2 and 3", () => {
      const three = deriveAddressSchema({ country: 'US', record: { ...US, address_lines: 3 }, locale: 'en', regionLevels: ['administrative_area'] });
      const output = applyAddressSettings(three, { ...defaults(), addressLine2: 'hidden', addressLine3: 'enabled' });
      expect(ids(output)).toContain('address_line_1');
      expect(ids(output)).not.toContain('address_line_2');
      expect(ids(output)).not.toContain('address_line_3');
    });

    it("addressLine3 'enabled' adds line 3 after line 2 on the same row, optional", () => {
      const output = applyAddressSettings(usSchema(), { ...defaults(), addressLine3: 'enabled' });
      expect(onRow(output, 4)).toEqual(['address_line_1', 'address_line_2', 'address_line_3']);
      expect(byId(output, 'address_line_3')).toEqual({
        id: 'address_line_3', token: 'A', type: 'text', labelType: 'address_line_3', required: false, row: 4
      });
      // idempotent when the record already produced three lines
      const three = deriveAddressSchema({ country: 'US', record: { ...US, address_lines: 3 }, locale: 'en', regionLevels: ['administrative_area'] });
      expect(ids(applyAddressSettings(three, { ...defaults(), addressLine3: 'enabled' })).filter((id) => id === 'address_line_3')).toHaveLength(1);
      // 'disabled' leaves what the record produced
      expect(ids(applyAddressSettings(three, defaults()))).toContain('address_line_3');
      expect(ids(applyAddressSettings(usSchema(), defaults()))).not.toContain('address_line_3');
    });

    it('required.<field> tightens only', () => {
      const output = applyAddressSettings(usSchema(), {
        ...defaults(),
        telephone: 'optional',
        required: { organization: 'required', address_line_2: 'required', postal_code: 'asCountry', telephone: 'required', sorting_code: 'required' }
      });
      expect(byId(output, 'organization').required).toBe(true);
      expect(byId(output, 'address_line_2').required).toBe(true);
      expect(byId(output, 'postal_code').required).toBe(true); // asCountry cannot loosen the country's Z
      expect(byId(output, 'telephone').required).toBe(true); // tighten wins over the optional setting
      expect(ids(output)).not.toContain('sorting_code'); // never adds a field

      const loosened = applyAddressSettings(usSchema(), { ...defaults(), required: { locality: 'asCountry', postal_code: 'asCountry' } });
      expect(byId(loosened, 'locality').required).toBe(true);
      expect(byId(loosened, 'postal_code').required).toBe(true);
    });

    it('keeps rows dense and country on row 0 after several removals', () => {
      const output = applyAddressSettings(usSchema(), {
        ...defaults(),
        telephone: 'hidden',
        organization: 'hidden',
        addressLine2: 'hidden'
      });
      expect(ids(output)).toEqual(['country', 'recipient', 'address_line_1', 'locality', 'administrative_area', 'postal_code']);
      expect(rows(output)).toEqual([0, 1, 2, 3, 3, 3]);
    });
  });

  describe('resolveDefaultCountry', () => {
    it('is the single sell-to country when the list has exactly one, whatever defaultCountry says', () => {
      const one = normalizeAddressSettings({ defaultCountry: 'none', sellToCountries: ['vn'] });
      expect(resolveDefaultCountry(one, 'US')).toBe('VN');
      const two = normalizeAddressSettings({ defaultCountry: 'none', sellToCountries: ['VN', 'US'] });
      expect(resolveDefaultCountry(two, 'US')).toBe('');
      const all = normalizeAddressSettings({ defaultCountry: 'store', sellToCountries: 'all' });
      expect(resolveDefaultCountry(all, 'US')).toBe('US');
    });

    it("'none' → '', 'store' → the store country, a code → upper-cased", () => {
      expect(resolveDefaultCountry({ ...defaults(), defaultCountry: 'none' }, 'VN')).toBe('');
      expect(resolveDefaultCountry({ ...defaults(), defaultCountry: 'store' }, 'vn')).toBe('VN');
      expect(resolveDefaultCountry({ ...defaults(), defaultCountry: 'store' })).toBe('');
      expect(resolveDefaultCountry({ ...defaults(), defaultCountry: 'us' }, 'VN')).toBe('US');
    });
  });

  describe('resolveSellToCountries', () => {
    const all = ['US', 'VN', 'DE', 'JP'];
    const zones = ['VN', 'JP', 'KR'];

    it("'all' reproduces today's behaviour", () => {
      const s = defaults();
      expect(resolveSellToCountries(s, 'ALL', all)).toEqual(all);
      expect(resolveSellToCountries(s, 'SELL_TO', all)).toEqual(all);
      expect(resolveSellToCountries(s, 'SHIPPING', all, zones)).toEqual(['VN', 'JP']);
      expect(resolveSellToCountries(s, 'SHIPPING', all)).toEqual(all);
    });

    it('a list narrows SELL_TO to it and SHIPPING to list ∩ zones', () => {
      const s = { ...defaults(), sellToCountries: ['VN', 'US', 'kr', 'VN'] };
      expect(resolveSellToCountries(s, 'ALL', all)).toEqual(all);
      expect(resolveSellToCountries(s, 'SELL_TO', all)).toEqual(['VN', 'US', 'KR']);
      expect(resolveSellToCountries(s, 'SHIPPING', all, zones)).toEqual(['VN', 'KR']);
      expect(resolveSellToCountries(s, 'SHIPPING', all)).toEqual(['VN', 'US', 'KR']);
      expect(resolveSellToCountries(s, 'SHIPPING', all, [])).toEqual([]);
    });

    it('returns copies', () => {
      const s = defaults();
      const result = resolveSellToCountries(s, 'ALL', all);
      result.push('XX');
      expect(all).toHaveLength(4);
    });
  });

  describe('isCountryAllowed', () => {
    it("'all' allows every country on account and billing, zone countries on shipping", () => {
      const s = defaults();
      expect(isCountryAllowed('US', s, 'account')).toBe(true);
      expect(isCountryAllowed('US', s, 'billing', ['VN'])).toBe(true);
      expect(isCountryAllowed('US', s, 'shipping', ['VN'])).toBe(false);
      expect(isCountryAllowed('vn', s, 'shipping', ['VN'])).toBe(true);
      expect(isCountryAllowed('US', s, 'shipping')).toBe(true);
      expect(isCountryAllowed('', s, 'account')).toBe(false);
    });

    it('a list restricts account and billing; shipping also needs a zone', () => {
      const s = { ...defaults(), sellToCountries: ['VN', 'US'] };
      expect(isCountryAllowed('US', s, 'account')).toBe(true);
      expect(isCountryAllowed('DE', s, 'billing')).toBe(false);
      expect(isCountryAllowed('US', s, 'shipping', ['VN'])).toBe(false);
      expect(isCountryAllowed('VN', s, 'shipping', ['VN'])).toBe(true);
      expect(isCountryAllowed('JP', s, 'shipping', ['JP'])).toBe(false);
      expect(isCountryAllowed('US', s, 'shipping')).toBe(true);
    });
  });
});
