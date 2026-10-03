import { describe, it, expect } from '@jest/globals';
import { deriveAddressSchema } from '@evershop/evershop/lib/address/derive';
import type { ResolvedAddressSchema } from '@evershop/evershop/lib/address/types';
import { US, DE, HK, CN, VN } from '../../../../../../lib/address/tests/unit/addressFixtures.js';
import {
  countrySwapPlan,
  dependentsOf,
  fieldName,
  geographicFieldsReady,
  initialValuesFor,
  normalizeTelephoneInput,
  parentChain,
  previewLines,
  requoteKey,
  requoteParamsFor,
  rowsOf,
  serverAddressErrors,
  storedRequoteParams
} from '../../addressFormLogic.js';

const us = deriveAddressSchema({ country: 'US', record: US, locale: 'en', regionLevels: ['administrative_area'] });
const de = deriveAddressSchema({ country: 'DE', record: DE, locale: 'en', regionLevels: [] });
const hk = deriveAddressSchema({ country: 'HK', record: HK, locale: 'en', regionLevels: ['administrative_area'] });
const cn = deriveAddressSchema({
  country: 'CN',
  record: CN,
  locale: 'zh',
  regionLevels: ['administrative_area', 'locality']
});
const vn = deriveAddressSchema({ country: 'VN', record: VN, locale: 'vi', regionLevels: ['administrative_area'] });

const ids = (s: ResolvedAddressSchema) => s.fields.map((f) => f.id);

describe('fieldName / rowsOf', () => {
  it('prefixes with a dot, or not at all for the account surface', () => {
    expect(fieldName('shippingAddress', 'locality')).toBe('shippingAddress.locality');
    expect(fieldName('', 'locality')).toBe('locality');
  });

  it('groups fields by row in schema order, country first', () => {
    const rows = rowsOf(us);
    expect(rows[0].map((f) => f.id)).toEqual(['country']);
    expect(rows.flat().map((f) => f.id)).toEqual(ids(us));
    // US: "%C, %S %Z" share a line.
    const last = rows.find((r) => r.some((f) => f.id === 'postal_code'))!;
    expect(last.map((f) => f.id)).toEqual(['locality', 'administrative_area', 'postal_code']);
  });
});

describe('countrySwapPlan (spec § 3.9)', () => {
  it('removes fields absent from the new schema, clears changed shapes and option-sourced levels, keeps the rest', () => {
    const plan = countrySwapPlan(us, de);
    expect(plan.remove).toEqual(['administrative_area']); // DE has no %S
    expect(plan.clear).toContain('postal_code'); // zip pattern differs
    expect(plan.keep).toEqual(expect.arrayContaining(['recipient', 'telephone', 'address_line_1', 'locality']));
    expect(plan.keep).not.toContain('postal_code');
  });

  it('clears a region select even when both countries enumerate the level (keys are country-scoped)', () => {
    const plan = countrySwapPlan(us, hk);
    expect(plan.clear).toContain('administrative_area');
    expect(plan.keep).not.toContain('administrative_area');
  });

  it('is empty without a previous schema or when the country did not change', () => {
    expect(countrySwapPlan(undefined, us)).toEqual({ clear: [], remove: [], keep: [] });
    expect(countrySwapPlan(us, { ...us })).toEqual({ clear: [], remove: [], keep: [] });
  });

  it('never touches country', () => {
    const plan = countrySwapPlan(us, de);
    expect([...plan.clear, ...plan.remove, ...plan.keep]).not.toContain('country');
  });
});

describe('dependsOn chain', () => {
  it('finds the outer level of a dependent select and the dependents of a parent', () => {
    const locality = cn.fields.find((f) => f.id === 'locality')!;
    expect(locality.dependsOn).toBe('administrative_area');
    expect(parentChain(cn, locality).map((f) => f.id)).toEqual(['administrative_area']);
    expect(dependentsOf(cn, 'administrative_area')).toEqual(['locality']);
    expect(dependentsOf(us, 'administrative_area')).toEqual([]);
  });
});

describe('initialValuesFor', () => {
  const stored = {
    recipient: 'Ada Lovelace',
    organization: 'Analytical Engines',
    addressLine1: '1 Infinite Loop',
    addressLine2: 'Suite 2',
    locality: { key: 'Cupertino', name: 'Cupertino' },
    administrativeArea: { key: 'CA', name: 'California', isoCode: 'US-CA' },
    postalCode: '95014',
    country: { code: 'US', name: 'United States' },
    telephone: '+14085551234',
    extra: { tax_id: 'ABC-1' }
  };

  it('maps the GraphQL shape onto field ids, regions by key, the country by code', () => {
    const values = initialValuesFor(stored, us);
    expect(values).toMatchObject({
      recipient: 'Ada Lovelace',
      organization: 'Analytical Engines',
      address_line_1: '1 Infinite Loop',
      locality: 'Cupertino',
      administrative_area: 'CA',
      postal_code: '95014',
      country: 'US',
      telephone: '+14085551234'
    });
    // Not in the US schema (no address_line_2 field here, no tax_id extra): dropped.
    expect(values).not.toHaveProperty('tax_id');
  });

  it('reads a registered extra from `extra`', () => {
    const withExtra: ResolvedAddressSchema = {
      ...us,
      fields: [...us.fields, { id: 'tax_id', type: 'text', labelType: 'extra', label: 'Tax ID', required: false, row: 9 }]
    };
    expect(initialValuesFor(stored, withExtra).tax_id).toBe('ABC-1');
  });

  it('pre-fills split names from the lossy split when the row has only recipient (spec § 3.12 rule 3)', () => {
    const split: ResolvedAddressSchema = {
      ...us,
      fields: us.fields.flatMap((f) =>
        f.id === 'recipient'
          ? [
              { ...f, id: 'given_name', labelType: 'given_name' },
              { ...f, id: 'family_name', labelType: 'family_name' }
            ]
          : [f]
      )
    };
    const values = initialValuesFor(stored, split);
    expect(values.given_name).toBe('Ada');
    expect(values.family_name).toBe('Lovelace');
    // Stored parts win over the guess.
    const parts = initialValuesFor({ ...stored, givenName: 'Augusta', familyName: 'King' }, split);
    expect(parts).toMatchObject({ given_name: 'Augusta', family_name: 'King' });
  });

  it('is empty for a new address', () => {
    expect(initialValuesFor(null, us)).toEqual({});
  });
});

describe('re-quote parameters (spec § 3.10)', () => {
  it('derives the destination from the schema tokens C S Z D plus the country', () => {
    expect(
      requoteParamsFor(us, {
        country: 'us',
        recipient: 'Ada',
        telephone: '+1',
        address_line_1: '1 Loop',
        locality: 'Cupertino',
        administrative_area: 'CA',
        postal_code: '95014'
      })
    ).toEqual({ country: 'US', locality: 'Cupertino', administrativeArea: 'CA', postalCode: '95014' });
  });

  it('includes a dependent locality where the format has %D and skips empty values', () => {
    expect(
      requoteParamsFor(cn, { country: 'CN', administrative_area: 'Beijing', locality: '', dependent_locality: 'Chaoyang' })
    ).toEqual({ country: 'CN', administrativeArea: 'Beijing', dependentLocality: 'Chaoyang' });
  });

  it('is null without a schema or a country', () => {
    expect(requoteParamsFor(undefined, { country: 'US' })).toBeNull();
    expect(requoteParamsFor(us, { locality: 'Cupertino' })).toBeNull();
  });

  it('keys do not depend on field order and ignore name/telephone edits', () => {
    const a = requoteKey({ country: 'US', postalCode: '95014', locality: 'Cupertino' });
    const b = requoteKey({ locality: 'Cupertino', country: 'US', postalCode: '95014' });
    expect(a).toBe(b);
    const before = requoteKey(requoteParamsFor(us, { country: 'US', recipient: 'A', postal_code: '95014' }));
    const after = requoteKey(requoteParamsFor(us, { country: 'US', recipient: 'B', telephone: '+1', postal_code: '95014' }));
    expect(after).toBe(before);
    expect(requoteKey(null)).toBeNull();
  });

  it('the stored-address baseline matches what the same values produce through the schema', () => {
    const stored = {
      country: { code: 'US', name: 'United States' },
      administrativeArea: { key: 'CA', name: 'California' },
      locality: { key: 'Cupertino', name: 'Cupertino' },
      postalCode: '95014'
    };
    expect(requoteKey(storedRequoteParams(stored))).toBe(
      requoteKey(requoteParamsFor(us, { country: 'US', administrative_area: 'CA', locality: 'Cupertino', postal_code: '95014' }))
    );
    expect(storedRequoteParams(null)).toBeNull();
  });
});

describe('geographicFieldsReady (spec § 9 AC1)', () => {
  it('Hong Kong is ready without a postal code; Germany without an administrative area', () => {
    expect(geographicFieldsReady(hk, { country: 'HK', administrative_area: 'Kowloon' })).toBe(true);
    expect(geographicFieldsReady(de, { country: 'DE', locality: 'Berlin', postal_code: '10115' })).toBe(true);
  });

  it('the United States needs state and ZIP; nothing is ready without a country or schema', () => {
    expect(geographicFieldsReady(us, { country: 'US', locality: 'Cupertino', administrative_area: 'CA' })).toBe(false);
    expect(geographicFieldsReady(us, { country: 'US', locality: 'Cupertino', administrative_area: 'CA', postal_code: '95014' })).toBe(true);
    expect(geographicFieldsReady(us, { locality: 'Cupertino' })).toBe(false);
    expect(geographicFieldsReady(undefined, { country: 'US' })).toBe(false);
  });

  it('an optional geographic field does not block (Vietnam postal code)', () => {
    expect(vn.fields.find((f) => f.id === 'postal_code')?.required).toBe(false);
    expect(geographicFieldsReady(vn, { country: 'VN', administrative_area: 'VN-SG', locality: 'Quận 1' })).toBe(true);
  });
});

describe('previewLines', () => {
  it('renders the current values through the country format with option labels, without the country', () => {
    // Same output as the server's `formatted`: `upper` is carried for envelope
    // printers and applied by neither side.
    const lines = previewLines(
      us,
      { recipient: 'Ada Lovelace', address_line_1: '1 Infinite Loop', locality: 'Cupertino', administrative_area: 'CA', postal_code: '95014' },
      { administrative_area: { CA: 'California' } }
    );
    expect(lines).toEqual(['Ada Lovelace', '1 Infinite Loop', 'Cupertino, California 95014']);
  });

  it('is empty when nothing is typed', () => {
    expect(previewLines(us, {})).toEqual([]);
  });
});

describe('serverAddressErrors (spec § 3.8)', () => {
  it('sets every field-targeted error on its prefixed name and returns the rest', () => {
    const calls: [string, { type: string; message: string }][] = [];
    const result = serverAddressErrors(
      { message: 'Invalid', errors: [{ field: 'postal_code', code: 'pattern', message: 'ZIP code is not valid' }, { message: 'Cross-field rule' }] },
      'shippingAddress',
      (name, err) => calls.push([name, err])
    );
    expect(calls).toEqual([['shippingAddress.postal_code', { type: 'server', message: 'ZIP code is not valid' }]]);
    expect(result).toEqual({ applied: 1, unassigned: ['Cross-field rule'] });
  });

  it('ignores errors without the array', () => {
    expect(serverAddressErrors(new Error('boom'), '', () => undefined)).toEqual({ applied: 0, unassigned: [] });
  });
});

describe('normalizeTelephoneInput (mirrors the server before a pattern runs)', () => {
  it('drops separators, turns 00 into +, leaves anything else trimmed', () => {
    expect(normalizeTelephoneInput('0912 345 678')).toBe('0912345678');
    expect(normalizeTelephoneInput('+84 (912) 345-678')).toBe('+84912345678');
    expect(normalizeTelephoneInput('0084 912 345 678')).toBe('+84912345678');
    expect(normalizeTelephoneInput('  +1.408.555.1234 ')).toBe('+14085551234');
    expect(normalizeTelephoneInput('call me')).toBe('call me');
    expect(normalizeTelephoneInput('')).toBe('');
    expect(normalizeTelephoneInput(undefined)).toBe('');
  });
});
