import { describe, expect, it, jest } from '@jest/globals';
import {
  createFakeDb,
  createFakeQueryBuilder
} from '../../../customer/tests/unit/fakeQueryBuilder.js';

const rate = (overrides: Record<string, unknown>) => ({
  tax_class_id: 1,
  uuid: `r-${String(overrides.name)}`,
  country: '*',
  administrative_area: '*',
  postal_code: '*',
  rate: '5',
  is_compound: false,
  priority: 0,
  ...overrides
});
const db = createFakeDb({
  tax_rate: [
    rate({ tax_rate_id: 1, name: 'CA+NV', country: 'US', administrative_area: 'US-CA,US-NV' }),
    rate({ tax_rate_id: 2, name: 'everywhere' }),
    rate({ tax_rate_id: 3, name: 'one zip', country: 'US', postal_code: '94043' }),
    rate({ tax_rate_id: 4, name: 'empty means any', country: 'US', administrative_area: '', postal_code: '' }),
    rate({ tax_rate_id: 5, name: 'other class', tax_class_id: 2 })
  ]
});
const qb = createFakeQueryBuilder(db);
jest.unstable_mockModule('@evershop/postgres-query-builder', () => ({ ...qb }));
jest.unstable_mockModule('../../../../lib/postgres/connection.js', () => ({ pool: qb.pool }));

const { getTaxRates } = await import('../../services/getTaxRates.js');
const names = (rates: Array<{ name: string }>) => rates.map((r) => r.name).sort();

describe('getTaxRates on the renamed columns (spec § 3.10)', () => {
  it('matches region keys, comma lists, `*` and empty values', async () => {
    expect(names(await getTaxRates(1, 'US', 'US-CA', '94043'))).toEqual(
      ['CA+NV', 'everywhere', 'one zip', 'empty means any'].sort()
    );
    expect(names(await getTaxRates(1, 'US', 'US-NY', '10001'))).toEqual(['everywhere', 'empty means any'].sort());
    expect(names(await getTaxRates(1, 'DE', 'DE-BE', '10117'))).toEqual(['everywhere']);
  });

  it('a missing administrative area or postal code on the address passes that rule', async () => {
    expect(names(await getTaxRates(1, 'US', null, null))).toEqual(
      ['CA+NV', 'everywhere', 'one zip', 'empty means any'].sort()
    );
  });

  it('returns nothing without a country and parses the lists on the returned rows', async () => {
    expect(await getTaxRates(1, '', 'US-CA')).toEqual([]);
    const [caNv] = await getTaxRates(1, 'US', 'US-NV', null);
    expect(caNv.administrative_area).toEqual(['US-CA', 'US-NV']);
    expect(caNv.postal_code).toEqual(['*']);
  });
});
