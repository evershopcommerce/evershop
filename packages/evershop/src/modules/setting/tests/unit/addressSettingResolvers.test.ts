import { jest, describe, it, expect } from '@jest/globals';

/**
 * The admin page reads the eight address settings through `Setting`; the
 * resolvers must return the normalized values (defaults applied), not raw rows.
 */
const settings = {
  nameFormat: 'split',
  telephone: 'optional',
  organization: 'required',
  addressLine2: 'hidden',
  addressLine3: 'enabled',
  required: { postal_code: 'required' },
  defaultCountry: 'VN',
  sellToCountries: ['VN', 'US']
};
jest.unstable_mockModule('../../../base/services/address/getAddressSettings.js', () => ({
  getAddressSettings: () => settings
}));
const resolvers = (await import('../../graphql/types/AddressSetting/AddressSetting.admin.resolvers.js')).default as {
  Setting: Record<string, () => unknown>;
};

describe('Setting.address* resolvers', () => {
  it('expose the eight normalized settings under their row names', () => {
    const s = resolvers.Setting;
    expect(Object.keys(s).sort()).toEqual([
      'addressDefaultCountry', 'addressLine2', 'addressLine3', 'addressNameFormat',
      'addressOrganization', 'addressRequired', 'addressSellToCountries', 'addressTelephone'
    ]);
    expect(s.addressNameFormat()).toBe('split');
    expect(s.addressTelephone()).toBe('optional');
    expect(s.addressOrganization()).toBe('required');
    expect(s.addressLine2()).toBe('hidden');
    expect(s.addressLine3()).toBe('enabled');
    expect(s.addressRequired()).toEqual({ postal_code: 'required' });
    expect(s.addressDefaultCountry()).toBe('VN');
    expect(s.addressSellToCountries()).toEqual(['VN', 'US']);
  });
});
