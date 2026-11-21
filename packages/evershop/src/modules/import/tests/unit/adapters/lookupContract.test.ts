import { describe, expect, it } from '@jest/globals';
import { MemoryLookup } from '../../../testing/MemoryLookup.js';
import { lookupContract } from '../helpers/lookupContract.js';
import { memoryLookupHarness } from '../helpers/memoryHarnesses.js';

lookupContract('MemoryLookup', async () => memoryLookupHarness());

// What only the double can be told: the real store has settings to read.
describe('MemoryLookup: what a fixture can say that the real store keeps in settings', () => {
  it('writes names as two parts when the fixture says so', async () => {
    const rules = await new MemoryLookup({
      addressNameFormat: 'split'
    }).addressRules();
    expect(rules.nameFormat()).toBe('split');
    expect((await new MemoryLookup().addressRules()).nameFormat()).toBe(
      'single'
    );
  });

  it('sells to the countries the fixture lists', async () => {
    const rules = await new MemoryLookup({
      addressSellTo: ['GB']
    }).addressRules();
    const problems = await rules.check({
      recipient: 'Jane',
      address_line_1: '1 Market Street',
      locality: 'San Francisco',
      administrative_area: 'US-CA',
      postal_code: '94105',
      country: 'US',
      telephone: '+14155550100'
    });
    expect(problems.map((p) => `${p.field}:${p.code}`)).toEqual([
      'country:country_not_allowed'
    ]);
  });
});
