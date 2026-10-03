import { describe, expect, it } from '@jest/globals';
import { toCarrierAddress } from '../../services/createShipment.js';

const US = {
  order_address_id: 1,
  uuid: 'a1',
  recipient: 'Jane Smith',
  given_name: null,
  family_name: null,
  organization: 'ACME Corp',
  address_line_1: '1600 Amphitheatre Pkwy',
  address_line_2: 'Suite 200',
  address_line_3: 'Floor 3',
  dependent_locality: null,
  locality: 'Mountain View',
  administrative_area: 'US-CA',
  postal_code: '94043',
  sorting_code: null,
  country: 'US',
  telephone: '+16502530000',
  extra: null
};

describe('toCarrierAddress (spec § 3.10, D-15)', () => {
  it('fills company, joins the remaining lines into address2 and keeps the carrier field names', async () => {
    expect(await toCarrierAddress(US)).toEqual({
      fullName: 'Jane Smith',
      company: 'ACME Corp',
      address1: '1600 Amphitheatre Pkwy',
      address2: 'Suite 200, Floor 3',
      dependentLocality: undefined,
      city: 'Mountain View',
      province: 'US-CA',
      postcode: '94043',
      country: 'US',
      phone: '+16502530000'
    });
  });

  it('carries the dependent locality and composes the recipient from parts when needed', async () => {
    const vn = {
      ...US,
      recipient: null,
      given_name: 'Văn A',
      family_name: 'Nguyễn',
      organization: null,
      address_line_2: null,
      address_line_3: null,
      dependent_locality: 'Phường Bến Nghé',
      locality: 'Quận 1',
      administrative_area: 'VN-SG',
      postal_code: '70000',
      country: 'VN',
      telephone: '+84912345678'
    };
    const result = await toCarrierAddress(vn);
    expect(result).toMatchObject({
      fullName: 'Nguyễn Văn A',
      address2: undefined,
      dependentLocality: 'Phường Bến Nghé',
      city: 'Quận 1',
      province: 'VN-SG',
      country: 'VN'
    });
    expect(result.company).toBeUndefined();
  });

  it('throws when the order has no shipping address row', async () => {
    await expect(toCarrierAddress(null)).rejects.toThrow('cannot build carrier input');
  });
});
