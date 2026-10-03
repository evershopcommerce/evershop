import { beforeEach, describe, expect, it } from '@jest/globals';
import {
  __derivationCacheSizeForTests,
  __resetDerivationCacheForTests,
  deriveAddressSchema,
  resolveAddressSchema
} from '../../derive.js';
import { __resetAddressExtrasForTests, registerAddressField } from '../../extras.js';
import { __resetAddressFormatsForTests, getRegistryGeneration, patchAddressFormat } from '../../formats.js';
import { __resetRegionProvidersForTests, registerRegionProvider } from '../../regions.js';
import { configureAddressRuntime, resetAddressRuntime } from '../../runtime.js';
import { ADDRESS_SETTINGS_DEFAULTS } from '../../settings.js';
import type { AddressSettings, ResolvedAddressSchema } from '../../types.js';
import { byId, CN, ids, JP, onRow, rowOf, US, ZZ } from './addressFixtures.js';

const settings = (over: Partial<AddressSettings> = {}): AddressSettings => ({ ...ADDRESS_SETTINGS_DEFAULTS, required: {}, ...over });

describe('lib/address resolveAddressSchema', () => {
  beforeEach(() => {
    __resetAddressFormatsForTests();
    __resetRegionProvidersForTests();
    __resetAddressExtrasForTests();
    __resetDerivationCacheForTests();
    resetAddressRuntime();
  });

  it('resolves a bundled country through the registries: record + region levels', () => {
    const schema = resolveAddressSchema('US', 'en');
    expect(schema.country).toBe('US');
    expect(schema.locale).toBe('en');
    expect(ids(schema)).toEqual([
      'country', 'recipient', 'telephone', 'organization', 'address_line_1', 'address_line_2', 'locality', 'administrative_area', 'postal_code'
    ]);
    expect(byId(schema, 'administrative_area')).toMatchObject({ type: 'select', optionSource: 'regions', labelType: 'state' });
    expect(resolveAddressSchema('us', 'en')).toEqual(schema);
  });

  it("'' and an unknown code resolve the DEFAULT record; the unknown code is kept", () => {
    const none = resolveAddressSchema('', 'en');
    expect(none.country).toBe('');
    expect(ids(none)).toEqual(['country', 'recipient', 'telephone', 'organization', 'address_line_1', 'address_line_2', 'locality']);
    const unknown = resolveAddressSchema('QX', 'en');
    expect(unknown.country).toBe('QX');
    expect(unknown.fields).toEqual(none.fields);
  });

  it('locale defaults to the runtime locale and drives script selection', () => {
    patchAddressFormat('QZ', JP);
    expect(resolveAddressSchema('QZ').script).toBe('latin'); // default runtime locale 'en'
    configureAddressRuntime({ getLocale: () => 'ja' });
    const native = resolveAddressSchema('QZ');
    expect(native.locale).toBe('ja');
    expect(native.script).toBe('native');
    expect(native.format).toBe(JP.fmt);
    expect(resolveAddressSchema('QZ', 'en').script).toBe('latin');
  });

  describe('derivation cache', () => {
    it('hits on the same (country, locale, generation) and misses otherwise', () => {
      expect(__derivationCacheSizeForTests()).toBe(0);
      const first = resolveAddressSchema('US', 'en');
      expect(__derivationCacheSizeForTests()).toBe(1);
      const second = resolveAddressSchema('US', 'en', { surface: 'billing' });
      expect(__derivationCacheSizeForTests()).toBe(1);
      expect(second).toEqual(first);
      resolveAddressSchema('US', 'ja');
      expect(__derivationCacheSizeForTests()).toBe(2);
      resolveAddressSchema('DE', 'en');
      expect(__derivationCacheSizeForTests()).toBe(3);
      __resetDerivationCacheForTests();
      expect(__derivationCacheSizeForTests()).toBe(0);
    });

    it('a patch bumps the generation and changes the result on the next call', () => {
      const before = resolveAddressSchema('QZ', 'en');
      expect(ids(before)).not.toContain('postal_code');
      const generation = getRegistryGeneration();
      patchAddressFormat('QZ', { fmt: '%N%n%A%n%C %Z', require: 'ACZ', zip: '\\d{4}', zipex: '1000' });
      expect(getRegistryGeneration()).toBe(generation + 1);
      const after = resolveAddressSchema('QZ', 'en');
      expect(ids(after)).toContain('postal_code');
      expect(byId(after, 'postal_code')).toMatchObject({ required: true, placeholder: '1000', pattern: { regex: '^(?:\\d{4})$' } });
      expect(__derivationCacheSizeForTests()).toBe(2);
    });

    it('a region provider bumps the generation and changes the level types', () => {
      patchAddressFormat('QZ', CN);
      expect(byId(resolveAddressSchema('QZ', 'en'), 'locality').type).toBe('text');
      registerRegionProvider('QZ', {
        levels: ['administrative_area', 'locality', 'dependent_locality'],
        list: () => []
      });
      const schema = resolveAddressSchema('QZ', 'en');
      expect(byId(schema, 'administrative_area')).toMatchObject({ type: 'select', optionSource: 'regions' });
      expect(byId(schema, 'locality')).toMatchObject({ type: 'select', dependsOn: 'administrative_area' });
      expect(byId(schema, 'dependent_locality')).toMatchObject({ type: 'select', dependsOn: 'locality' });
    });

    it('never hands out the cached object: mutating a result does not affect the next call', () => {
      const first = resolveAddressSchema('US', 'en');
      first.fields[1].required = false;
      byId(first, 'postal_code').pattern!.regex = 'MUTATED';
      first.fields.pop();
      first.upper.push('N');
      const second = resolveAddressSchema('US', 'en');
      expect(second.fields[1].required).toBe(true);
      expect(ids(second)).toContain('postal_code');
      expect(second.upper).toEqual(['C', 'S']);
      expect(byId(second, 'postal_code').pattern!.regex).not.toBe('MUTATED');
    });
  });

  describe('the addressSchema hook', () => {
    it('can hide, relabel and re-require, and receives the context', () => {
      const contexts: unknown[] = [];
      configureAddressRuntime({
        applyHook: (schema, context) => {
          contexts.push(context);
          return {
            ...schema,
            fields: schema.fields
              .filter((f) => f.id !== 'organization')
              .map((f) => {
                if (f.id === 'locality') return { ...f, labelType: 'post_town' };
                if (f.id === 'address_line_2') return { ...f, required: true };
                return f;
              })
          };
        }
      });
      const schema = resolveAddressSchema('US', 'en', { surface: 'billing' });
      expect(ids(schema)).not.toContain('organization');
      expect(byId(schema, 'locality').labelType).toBe('post_town');
      expect(byId(schema, 'address_line_2').required).toBe(true);
      // rows renumbered densely after the hook's removal
      expect(schema.fields.map((f) => f.row)).toEqual([0, 1, 2, 3, 3, 4, 4, 4]);
      expect(contexts).toEqual([{ country: 'US', locale: 'en', surface: 'billing' }]);
    });

    it('is skipped with applyHook: false and when it returns nothing', () => {
      let calls = 0;
      configureAddressRuntime({
        applyHook: (schema) => {
          calls += 1;
          return { ...schema, fields: schema.fields.filter((f) => f.id !== 'organization') };
        }
      });
      expect(ids(resolveAddressSchema('US', 'en', { applyHook: false }))).toContain('organization');
      expect(calls).toBe(0);
      expect(ids(resolveAddressSchema('US', 'en'))).not.toContain('organization');
      expect(calls).toBe(1);

      configureAddressRuntime({ applyHook: () => undefined as unknown as ResolvedAddressSchema });
      expect(ids(resolveAddressSchema('US', 'en'))).toContain('organization');
    });

    it('runs before the merchant settings: settings have the last word', () => {
      configureAddressRuntime({
        applyHook: (schema) => ({
          ...schema,
          fields: schema.fields.map((f) => (f.id === 'telephone' ? { ...f, required: false } : f))
        })
      });
      expect(byId(resolveAddressSchema('US', 'en'), 'telephone').required).toBe(true); // default setting: required
      expect(byId(resolveAddressSchema('US', 'en', { settings: settings({ telephone: 'optional' }) }), 'telephone').required).toBe(false);
      expect(ids(resolveAddressSchema('US', 'en', { settings: settings({ telephone: 'hidden' }) }))).not.toContain('telephone');
    });
  });

  describe('settings', () => {
    it('come from the runtime unless passed explicitly', () => {
      configureAddressRuntime({ getSettings: () => settings({ nameFormat: 'split', organization: 'hidden' }) });
      const fromRuntime = resolveAddressSchema('US', 'en');
      expect(onRow(fromRuntime, 1)).toEqual(['given_name', 'family_name']);
      expect(ids(fromRuntime)).not.toContain('organization');

      const explicit = resolveAddressSchema('US', 'en', { settings: settings() });
      expect(ids(explicit)).toContain('recipient');
      expect(ids(explicit)).toContain('organization');
    });

    it('do not touch the cached derivation', () => {
      resolveAddressSchema('US', 'en', { settings: settings({ telephone: 'hidden' }) });
      expect(ids(resolveAddressSchema('US', 'en'))).toContain('telephone');
      expect(__derivationCacheSizeForTests()).toBe(1);
    });
  });

  describe('extras', () => {
    it('are inserted per country and surface, on their own row after the anchor', () => {
      registerAddressField({ id: 'tax_id', type: 'text', label: 'Tax ID', countries: ['US'], surfaces: ['billing'], after: 'organization' });
      registerAddressField({ id: 'note', type: 'textarea', label: 'Delivery note', surfaces: ['shipping'] });

      const billing = resolveAddressSchema('US', 'en', { surface: 'billing' });
      expect(rowOf(billing, 'tax_id')).toBe(rowOf(billing, 'organization') + 1);
      expect(onRow(billing, rowOf(billing, 'tax_id'))).toEqual(['tax_id']);
      expect(ids(billing)).not.toContain('note');
      expect(byId(billing, 'tax_id')).toMatchObject({ labelType: 'extra', label: 'Tax ID', required: false, type: 'text' });

      const shipping = resolveAddressSchema('US', 'en', { surface: 'shipping' });
      expect(ids(shipping)).not.toContain('tax_id');
      expect(ids(shipping).slice(-1)).toEqual(['note']);

      const unscoped = resolveAddressSchema('US', 'en');
      expect(ids(unscoped)).toContain('tax_id');
      expect(ids(unscoped)).toContain('note');

      expect(ids(resolveAddressSchema('DE', 'en', { surface: 'billing' }))).not.toContain('tax_id');
      expect(ids(resolveAddressSchema('', 'en', { surface: 'billing' }))).not.toContain('tax_id');
    });

    it('are visible to the hook and the settings filter', () => {
      registerAddressField({ id: 'vat_id', type: 'text', label: 'VAT' });
      const seen: string[][] = [];
      configureAddressRuntime({
        applyHook: (schema) => {
          seen.push(ids(schema));
          return { ...schema, fields: schema.fields.map((f) => (f.id === 'vat_id' ? { ...f, required: true } : f)) };
        }
      });
      const schema = resolveAddressSchema('US', 'en', { settings: settings({ telephone: 'hidden' }) });
      expect(seen[0]).toContain('vat_id');
      expect(byId(schema, 'vat_id').required).toBe(true);
      expect(schema.fields.map((f) => f.row)).toEqual([0, 1, 2, 3, 3, 4, 4, 4, 5]);
    });
  });

  it('matches the pure derivation for the same inputs', () => {
    const pure = deriveAddressSchema({ country: 'US', record: { ...US, telephone: { dialCode: '+1' } }, locale: 'en', regionLevels: ['administrative_area'] });
    expect(resolveAddressSchema('US', 'en')).toEqual(pure);
    const def = deriveAddressSchema({ country: '', record: ZZ, locale: 'en', regionLevels: [] });
    expect(resolveAddressSchema('', 'en')).toEqual(def);
  });
});
