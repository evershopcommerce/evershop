import { describe, it, expect } from '@jest/globals';
import { deriveAddressSchema } from '@evershop/evershop/lib/address/derive';
import type { ResolvedAddressSchema } from '@evershop/evershop/lib/address/types';
import { US, DE, HK, CN } from '../../../../../lib/address/tests/unit/addressFixtures.js';
import { REQUOTE_TOKENS, geographicFieldsReady, requoteKey, requoteParamsFor } from '../../../customer/address/addressFormLogic.js';

/**
 * `Shipment.tsx` re-quotes when `requoteKey(requoteParamsFor(schema, values))`
 * changes (spec § 3.10). The key must move for every geographic token the
 * country's format has — C, S, Z, D — and for nothing else, so typing a name
 * or a telephone never hits the carriers.
 */
const schemas: Record<string, ResolvedAddressSchema> = {
  US: deriveAddressSchema({ country: 'US', record: US, locale: 'en', regionLevels: ['administrative_area'] }),
  DE: deriveAddressSchema({ country: 'DE', record: DE, locale: 'en', regionLevels: [] }),
  HK: deriveAddressSchema({ country: 'HK', record: HK, locale: 'en', regionLevels: ['administrative_area'] }),
  CN: deriveAddressSchema({ country: 'CN', record: CN, locale: 'zh', regionLevels: ['administrative_area', 'locality'] })
};

const complete: Record<string, Record<string, string>> = {
  US: { country: 'US', recipient: 'Ada', telephone: '+1', organization: 'AE', address_line_1: '1 Loop', locality: 'Cupertino', administrative_area: 'CA', postal_code: '95014' },
  DE: { country: 'DE', recipient: 'Ada', telephone: '+49', organization: 'AE', address_line_1: 'Str 1', locality: 'Berlin', postal_code: '10115' },
  HK: { country: 'HK', recipient: 'Ada', telephone: '+852', organization: 'AE', address_line_1: '1 Nathan Rd', locality: 'Tsim Sha Tsui', administrative_area: 'Kowloon' },
  CN: { country: 'CN', recipient: 'Ada', telephone: '+86', organization: 'AE', address_line_1: '1 Rd', dependent_locality: 'Chaoyang', locality: 'Beijing', administrative_area: 'Beijing', postal_code: '100000' }
};

describe.each(Object.keys(schemas))('%s', (cc) => {
  const schema = schemas[cc];
  const base = complete[cc];
  const geographic = schema.fields.filter((f) => f.token && REQUOTE_TOKENS.includes(f.token));
  const other = schema.fields.filter((f) => !f.token || !REQUOTE_TOKENS.includes(f.token)).filter((f) => f.id !== 'country');

  it('has at least one geographic field and a complete baseline', () => {
    expect(geographic.length).toBeGreaterThan(0);
    expect(geographicFieldsReady(schema, base)).toBe(true);
  });

  it.each(geographic.map((f) => f.id))('re-quotes when %s changes', (id) => {
    const before = requoteKey(requoteParamsFor(schema, base));
    const after = requoteKey(requoteParamsFor(schema, { ...base, [id]: `${base[id] ?? ''}X` }));
    expect(after).not.toBe(before);
  });

  it.each(other.map((f) => f.id))('does not re-quote when %s changes', (id) => {
    const before = requoteKey(requoteParamsFor(schema, base));
    const after = requoteKey(requoteParamsFor(schema, { ...base, [id]: `${base[id] ?? ''}X` }));
    expect(after).toBe(before);
  });

  it('re-quotes when the country changes', () => {
    const before = requoteKey(requoteParamsFor(schema, base));
    expect(requoteKey(requoteParamsFor(schema, { ...base, country: cc === 'US' ? 'CA' : 'US' }))).not.toBe(before);
  });
});

it('the gate follows the schema, not a fixed field list: Hong Kong is ready without a postal code, the US is not', () => {
  expect(geographicFieldsReady(schemas.HK, { country: 'HK', administrative_area: 'Kowloon' })).toBe(true);
  expect(geographicFieldsReady(schemas.US, { country: 'US', administrative_area: 'CA', locality: 'Cupertino' })).toBe(false);
});
