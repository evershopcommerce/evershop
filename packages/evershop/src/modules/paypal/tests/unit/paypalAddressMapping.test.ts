import { describe, expect, it } from '@jest/globals';
import { buildPaypalShipping } from '../../services/paypalShippingAddress.js';

const US = {
  recipient: 'Jane Smith',
  organization: null,
  address_line_1: '1600 Amphitheatre Pkwy',
  address_line_2: 'Suite 200',
  address_line_3: null,
  dependent_locality: null,
  locality: 'Mountain View',
  administrative_area: 'US-CA',
  postal_code: '94043',
  country: 'US',
  telephone: '+16502530000'
};

describe('PayPal shipping address mapping (spec § 3.10)', () => {
  it('US: ISO suffix as admin_area_1, locality as admin_area_2, line 2 kept', async () => {
    expect(await buildPaypalShipping(US)).toEqual({
      name: { full_name: 'Jane Smith' },
      type: 'SHIPPING',
      address: {
        address_line_1: '1600 Amphitheatre Pkwy',
        address_line_2: 'Suite 200',
        admin_area_1: 'CA',
        admin_area_2: 'Mountain View',
        postal_code: '94043',
        country_code: 'US'
      }
    });
  });

  it('HK: an area without an ISO code falls back to its key; no postal code', async () => {
    const { address } = await buildPaypalShipping({
      ...US,
      address_line_2: null,
      locality: 'Tsim Sha Tsui',
      administrative_area: 'Kowloon',
      postal_code: '',
      country: 'HK'
    });
    expect(address).toEqual({
      address_line_1: '1600 Amphitheatre Pkwy',
      admin_area_1: 'Kowloon',
      admin_area_2: 'Tsim Sha Tsui',
      postal_code: '',
      country_code: 'HK'
    });
  });

  it('VN: the ward joins the second line; the recipient is composed from parts', async () => {
    const result = await buildPaypalShipping({
      ...US,
      recipient: null,
      given_name: 'Văn A',
      family_name: 'Nguyễn',
      address_line_2: 'Tầng 3',
      dependent_locality: 'Phường Bến Nghé',
      locality: 'Quận 1',
      administrative_area: 'VN-SG',
      postal_code: '70000',
      country: 'VN'
    });
    expect(result.name.full_name).toBe('Nguyễn Văn A');
    expect(result.address.address_line_2).toBe('Tầng 3, Phường Bến Nghé');
    expect(result.address.admin_area_1).toBe('SG');
  });

  it('truncates to PayPal’s limits', async () => {
    const { address } = await buildPaypalShipping({
      ...US,
      address_line_2: 'x'.repeat(400),
      locality: 'y'.repeat(200)
    });
    expect(address.address_line_2).toHaveLength(300);
    expect(address.admin_area_2).toHaveLength(120);
  });
});
