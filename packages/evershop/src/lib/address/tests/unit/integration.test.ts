import { describe, it, expect } from '@jest/globals';
import { toIntegrationAddress } from '../../integration.js';
import type { AddressRow } from '../../types.js';

const usRow: AddressRow = {
  recipient: 'Jane Smith',
  organization: 'ACME Inc.',
  address_line_1: '1600 Amphitheatre Pkwy',
  address_line_2: '',
  address_line_3: 'Building 43',
  locality: 'Mountain View',
  administrative_area: 'US-CA',
  postal_code: '94043',
  country: 'us',
  telephone: '+1 650 253 0000'
};

describe('toIntegrationAddress', () => {
  it('maps a US row with an ISO subdivision key', () => {
    expect(toIntegrationAddress(usRow, { administrativeArea: 'California', country: 'United States' })).toEqual({
      recipient: 'Jane Smith',
      organization: 'ACME Inc.',
      lines: ['1600 Amphitheatre Pkwy', 'Building 43'],
      locality: 'Mountain View',
      administrativeArea: { key: 'US-CA', name: 'California', isoSuffix: 'CA' },
      postalCode: '94043',
      country: 'US',
      telephone: '+1 650 253 0000'
    });
  });

  it('gives a name key no isoSuffix and falls back to the key as name', () => {
    const hk = toIntegrationAddress(
      { recipient: 'Chan Tai Man', address_line_1: '1 Nathan Road', administrative_area: 'Kowloon', country: 'HK' },
      {}
    );
    expect(hk.administrativeArea).toEqual({ key: 'Kowloon', name: 'Kowloon' });
    expect(hk.administrativeArea && 'isoSuffix' in hk.administrativeArea).toBe(false);
  });

  it('omits the administrative area, locality and other optionals when absent', () => {
    const result = toIntegrationAddress(
      { recipient: 'Max', address_line_1: 'Unter den Linden 1', locality: 'Berlin', postal_code: '10115', country: 'DE' },
      {}
    );
    expect(result).toEqual({
      recipient: 'Max',
      lines: ['Unter den Linden 1'],
      locality: 'Berlin',
      postalCode: '10115',
      country: 'DE'
    });
  });

  it('prefers resolved names over raw values for the localities', () => {
    const result = toIntegrationAddress(
      { recipient: 'A', dependent_locality: 'W1', locality: 'D1', administrative_area: 'VN-SG', country: 'VN' },
      { dependentLocality: 'Phường Bến Nghé', locality: 'Quận 1', administrativeArea: 'Thành phố Hồ Chí Minh' }
    );
    expect(result.dependentLocality).toBe('Phường Bến Nghé');
    expect(result.locality).toBe('Quận 1');
    expect(result.administrativeArea).toEqual({
      key: 'VN-SG',
      name: 'Thành phố Hồ Chí Minh',
      isoSuffix: 'SG'
    });
    const raw = toIntegrationAddress({ recipient: 'A', dependent_locality: 'W1', locality: 'D1', country: 'VN' }, {});
    expect(raw.dependentLocality).toBe('W1');
    expect(raw.locality).toBe('D1');
  });

  it('filters empty address lines and keeps their order', () => {
    const result = toIntegrationAddress(
      { recipient: 'A', address_line_1: '  ', address_line_2: 'Second', address_line_3: 'Third', country: 'FR' },
      {}
    );
    expect(result.lines).toEqual(['Second', 'Third']);
    expect(toIntegrationAddress({ recipient: 'A', country: 'FR' }, {}).lines).toEqual([]);
  });

  it('passes the stored name parts through and keeps the recipient', () => {
    const result = toIntegrationAddress(
      { recipient: 'Nguyễn Văn A', given_name: 'Văn A', family_name: 'Nguyễn', country: 'VN' },
      {}
    );
    expect(result.recipient).toBe('Nguyễn Văn A');
    expect(result.givenName).toBe('Văn A');
    expect(result.familyName).toBe('Nguyễn');
  });

  it('composes the recipient from the parts in the given order when it is empty', () => {
    expect(
      toIntegrationAddress({ given_name: 'Văn A', family_name: 'Nguyễn', country: 'VN' }, {}, 'family_first').recipient
    ).toBe('Nguyễn Văn A');
    expect(
      toIntegrationAddress({ given_name: 'Jane', family_name: 'Smith', country: 'US' }, {}).recipient
    ).toBe('Jane Smith');
  });

  it('never invents parts from a recipient', () => {
    const result = toIntegrationAddress({ recipient: 'Jane Smith', country: 'US' }, {});
    expect(result.givenName).toBeUndefined();
    expect(result.familyName).toBeUndefined();
    expect('givenName' in result).toBe(false);
  });

  it('carries the sorting code and upper-cases the country', () => {
    const result = toIntegrationAddress(
      { recipient: 'A', sorting_code: 'CEDEX 9', country: ' fr ' },
      {}
    );
    expect(result.sortingCode).toBe('CEDEX 9');
    expect(result.country).toBe('FR');
  });
});
