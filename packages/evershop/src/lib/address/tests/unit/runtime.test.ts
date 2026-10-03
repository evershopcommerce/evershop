import { beforeEach, describe, expect, it } from '@jest/globals';
import {
  configureAddressRuntime,
  getAddressRuntime,
  interpolateAddressMessage,
  resetAddressRuntime
} from '../../runtime.js';
import { ADDRESS_SETTINGS_DEFAULTS } from '../../settings.js';
import type { AddressRuntime, ResolvedAddressSchema } from '../../types.js';

const schema: ResolvedAddressSchema = {
  country: 'US',
  locale: 'en',
  script: 'native',
  format: '%N',
  nameOrder: 'given_first',
  upper: [],
  fields: []
};

describe('lib/address runtime', () => {
  beforeEach(() => {
    resetAddressRuntime();
  });

  it('defaults are pure: code settings, identity hook, interpolating translate, en, no store data', () => {
    const runtime = getAddressRuntime();
    expect(runtime.getSettings()).toBe(ADDRESS_SETTINGS_DEFAULTS);
    expect(runtime.applyHook(schema, { country: 'US', locale: 'en' })).toBe(schema);
    expect(runtime.translate('${field} is required', { field: 'City' })).toBe('City is required');
    expect(runtime.translate('Hello')).toBe('Hello');
    expect(runtime.getLocale()).toBe('en');
    expect(runtime.getStoreCountry()).toBeUndefined();
    expect(runtime.getZoneCountries()).toBeUndefined();
  });

  it('interpolation keeps unknown placeholders and tolerates spaces', () => {
    expect(interpolateAddressMessage('${ field } / ${other}', { field: 'ZIP' })).toBe('ZIP / ${other}');
    expect(interpolateAddressMessage('plain')).toBe('plain');
    expect(interpolateAddressMessage('We do not sell to ${country}', { country: 'Mars' })).toBe('We do not sell to Mars');
  });

  it('configureAddressRuntime merges over the current runtime, so several bootstraps can each inject their part', () => {
    configureAddressRuntime({ getLocale: () => 'vi' });
    configureAddressRuntime({ getStoreCountry: () => 'VN', getZoneCountries: () => ['VN', 'US'] });
    const runtime = getAddressRuntime();
    expect(runtime.getLocale()).toBe('vi');
    expect(runtime.getStoreCountry()).toBe('VN');
    expect(runtime.getZoneCountries()).toEqual(['VN', 'US']);
    // untouched keys keep their defaults
    expect(runtime.getSettings()).toBe(ADDRESS_SETTINGS_DEFAULTS);
    expect(runtime.translate('${field} x', { field: 'A' })).toBe('A x');
  });

  it('a later call overrides an earlier one for the same key', () => {
    configureAddressRuntime({ getLocale: () => 'vi' });
    configureAddressRuntime({ getLocale: () => 'de' });
    expect(getAddressRuntime().getLocale()).toBe('de');
  });

  it('ignores unknown keys and undefined values, rejects non-functions', () => {
    configureAddressRuntime({ getLocale: undefined, bogus: () => 1 } as unknown as Partial<AddressRuntime>);
    expect(getAddressRuntime().getLocale()).toBe('en');
    expect((getAddressRuntime() as unknown as Record<string, unknown>).bogus).toBeUndefined();
    expect(() =>
      configureAddressRuntime({ getLocale: 'vi' } as unknown as Partial<AddressRuntime>)
    ).toThrow(/'getLocale' must be a function/);
    expect(() => configureAddressRuntime(null as unknown as Partial<AddressRuntime>)).toThrow(/object/);
  });

  it('getAddressRuntime returns the live runtime; resetAddressRuntime restores the defaults', () => {
    const before = getAddressRuntime();
    expect(getAddressRuntime()).toBe(before);
    configureAddressRuntime({ getLocale: () => 'vi' });
    expect(getAddressRuntime()).not.toBe(before);
    resetAddressRuntime();
    expect(getAddressRuntime().getLocale()).toBe('en');
    expect(getAddressRuntime().getStoreCountry()).toBeUndefined();
  });
});
