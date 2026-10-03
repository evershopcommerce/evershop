import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import type {
  AddressRow,
  AddressSettings,
  ResolvedAddressField,
  ResolvedAddressSchema
} from '../../types.js';

/**
 * `validateAddressAgainstSchema` derives every rule from a resolved schema, so
 * these tests build schemas by hand (US-like, HK-like, a three-level CN-like
 * one and a split-name one) and mock the sibling registries: regions
 * (`isActiveRegionKey`), settings (`isCountryAllowed`), extras, labels, the
 * runtime and the derivation. Nothing here depends on the generated data.
 */

/** Mirrors the default runtime's `${key}` interpolation. */
const interpolate = (text: string, values?: Record<string, string>): string =>
  values
    ? text.replace(/\$\{(\w+)\}/g, (match, key: string) =>
        key in values ? values[key] : match
      )
    : text;

const LABELS: Record<string, string> = {
  recipient: 'Full name',
  given_name: 'Given name',
  family_name: 'Family name',
  organization: 'Company',
  address_line: 'Address',
  address_line_2: 'Address 2',
  telephone: 'Telephone',
  country: 'Country',
  state: 'State',
  province: 'Province',
  area: 'Area',
  city: 'City',
  district: 'District',
  zip: 'ZIP code'
};

const SETTINGS: AddressSettings = {
  nameFormat: 'single',
  telephone: 'required',
  organization: 'optional',
  addressLine2: 'shown',
  addressLine3: 'disabled',
  required: {},
  defaultCountry: 'store',
  sellToCountries: 'all'
};

const isActiveRegionKey = jest.fn(async (..._args: unknown[]) => true);
const isAddressRegistryLocked = jest.fn(() => false);
const isCountryAllowed = jest.fn((..._args: unknown[]) => true);
const getAddressExtras = jest.fn((..._args: unknown[]): { id: string }[] => []);
const labelFor = jest.fn(
  (field: ResolvedAddressField) =>
    field.label ?? LABELS[field.labelType] ?? field.id
);
const runtimeTranslate = jest.fn(interpolate);
const getZoneCountries = jest.fn((): string[] | undefined => undefined);
const getAddressRuntime = jest.fn(() => ({
  getSettings: () => SETTINGS,
  applyHook: (schema: ResolvedAddressSchema) => schema,
  translate: runtimeTranslate,
  getLocale: () => 'en',
  getStoreCountry: () => undefined,
  getZoneCountries
}));
const resolveAddressSchema = jest.fn((..._args: unknown[]) => US);

jest.unstable_mockModule('../../regions.js', () => ({ isActiveRegionKey }));
jest.unstable_mockModule('../../formats.js', () => ({
  isAddressRegistryLocked
}));
jest.unstable_mockModule('../../settings.js', () => ({ isCountryAllowed }));
jest.unstable_mockModule('../../extras.js', () => ({ getAddressExtras }));
jest.unstable_mockModule('../../labels.js', () => ({ labelFor }));
jest.unstable_mockModule('../../runtime.js', () => ({ getAddressRuntime }));
jest.unstable_mockModule('../../derive.js', () => ({ resolveAddressSchema }));

const {
  validateAddressAgainstSchema,
  validateAddress,
  addAddressValidationRule,
  __resetAddressValidationRulesForTests
} = await import('../../validate.js');

const f = (
  partial: Partial<ResolvedAddressField> & { id: string; labelType: string }
): ResolvedAddressField => ({
  type: 'text',
  required: false,
  row: 1,
  ...partial
});

const ZIP = {
  regex: '^(?:(\\d{5})(?:[ \\-](\\d{4}))?)$',
  messageKey: '${field} is invalid'
};
const TEL = {
  regex: '^\\+?[0-9 ().\\-]{6,20}$',
  messageKey: '${field} is invalid'
};

const country = f({
  id: 'country',
  type: 'select',
  labelType: 'country',
  required: true,
  row: 0
});
const recipient = f({
  id: 'recipient',
  token: 'N',
  labelType: 'recipient',
  required: true,
  row: 1
});
const telephone = f({
  id: 'telephone',
  type: 'tel',
  labelType: 'telephone',
  required: true,
  pattern: TEL,
  row: 2
});
const organization = f({
  id: 'organization',
  token: 'O',
  labelType: 'organization',
  row: 3
});
const line1 = f({
  id: 'address_line_1',
  token: 'A',
  labelType: 'address_line',
  required: true,
  row: 4
});
const line2 = f({
  id: 'address_line_2',
  token: 'A',
  labelType: 'address_line_2',
  row: 4
});

const US: ResolvedAddressSchema = {
  country: 'US',
  locale: 'en',
  script: 'native',
  format: '%N%n%O%n%A%n%C, %S %Z',
  nameOrder: 'given_first',
  upper: ['C', 'S'],
  fields: [
    country,
    recipient,
    telephone,
    organization,
    line1,
    line2,
    f({ id: 'locality', token: 'C', labelType: 'city', required: true, row: 5 }),
    f({
      id: 'administrative_area',
      token: 'S',
      type: 'select',
      labelType: 'state',
      required: true,
      optionSource: 'regions',
      row: 5
    }),
    f({
      id: 'postal_code',
      token: 'Z',
      labelType: 'zip',
      required: true,
      pattern: ZIP,
      placeholder: '95014',
      row: 5
    })
  ]
};

/** HK: area is an enumerated select, district free text and optional, no postal code. */
const HK: ResolvedAddressSchema = {
  country: 'HK',
  locale: 'en',
  script: 'latin',
  format: '%N%n%O%n%A%n%C%n%S',
  nameOrder: 'family_first',
  upper: ['S'],
  fields: [
    country,
    recipient,
    telephone,
    organization,
    line1,
    line2,
    f({ id: 'locality', token: 'C', labelType: 'district', row: 5 }),
    f({
      id: 'administrative_area',
      token: 'S',
      type: 'select',
      labelType: 'area',
      required: true,
      optionSource: 'regions',
      row: 6
    })
  ]
};

/** CN-like: three enumerated levels chained by `dependsOn`. */
const CN: ResolvedAddressSchema = {
  country: 'CN',
  locale: 'en',
  script: 'latin',
  format: '%N%n%O%n%A%n%D%n%C%n%S, %Z',
  nameOrder: 'family_first',
  upper: ['S'],
  fields: [
    country,
    recipient,
    telephone,
    line1,
    f({
      id: 'dependent_locality',
      token: 'D',
      type: 'select',
      labelType: 'district',
      optionSource: 'regions',
      dependsOn: 'locality',
      row: 4
    }),
    f({
      id: 'locality',
      token: 'C',
      type: 'select',
      labelType: 'city',
      required: true,
      optionSource: 'regions',
      dependsOn: 'administrative_area',
      row: 5
    }),
    f({
      id: 'administrative_area',
      token: 'S',
      type: 'select',
      labelType: 'province',
      required: true,
      optionSource: 'regions',
      row: 6
    })
  ]
};

/** US in split mode: the name row carries the two parts and no `recipient` input. */
const SPLIT: ResolvedAddressSchema = {
  ...US,
  fields: [
    country,
    f({ id: 'given_name', labelType: 'given_name', required: true, row: 1 }),
    f({ id: 'family_name', labelType: 'family_name', required: true, row: 1 }),
    ...US.fields.slice(2)
  ]
};

const validUS: AddressRow = {
  recipient: 'Jane Smith',
  telephone: '+1 650 253 0000',
  address_line_1: '1600 Amphitheatre Pkwy',
  locality: 'Mountain View',
  administrative_area: 'US-CA',
  postal_code: '94043',
  country: 'US'
};

const codesOf = (errors: { field?: string; code: string }[]) =>
  errors.map((e) => `${e.field}:${e.code}`);

beforeEach(() => {
  __resetAddressValidationRulesForTests();
  jest.clearAllMocks();
  isActiveRegionKey.mockReset();
  isActiveRegionKey.mockResolvedValue(true);
  isCountryAllowed.mockReset();
  isCountryAllowed.mockReturnValue(true);
  getAddressExtras.mockReset();
  getAddressExtras.mockReturnValue([]);
  isAddressRegistryLocked.mockReset();
  isAddressRegistryLocked.mockReturnValue(false);
  getZoneCountries.mockReset();
  getZoneCountries.mockReturnValue(undefined);
});

describe('validateAddressAgainstSchema — required and pattern', () => {
  it('passes a complete US address', async () => {
    const result = await validateAddressAgainstSchema(validUS, US);
    expect(result).toEqual({ valid: true, errors: [] });
  });

  it('collects every required error with the translated label', async () => {
    const result = await validateAddressAgainstSchema({ country: 'US' }, US);
    expect(result.valid).toBe(false);
    expect(codesOf(result.errors)).toEqual([
      'recipient:required',
      'telephone:required',
      'address_line_1:required',
      'locality:required',
      'administrative_area:required',
      'postal_code:required'
    ]);
    expect(result.errors.map((e) => e.message)).toEqual([
      'Full name is required',
      'Telephone is required',
      'Address is required',
      'City is required',
      'State is required',
      'ZIP code is required'
    ]);
  });

  it('treats whitespace-only values as empty', async () => {
    const result = await validateAddressAgainstSchema(
      { ...validUS, locality: '   ' },
      US
    );
    expect(codesOf(result.errors)).toEqual(['locality:required']);
  });

  it('applies the pattern to the trimmed value and reports its messageKey', async () => {
    expect(
      (await validateAddressAgainstSchema({ ...validUS, postal_code: ' 94043-1234 ' }, US)).valid
    ).toBe(true);
    const result = await validateAddressAgainstSchema(
      { ...validUS, postal_code: 'ABCDE' },
      US
    );
    expect(result.errors).toEqual([
      { field: 'postal_code', code: 'pattern', message: 'ZIP code is invalid' }
    ]);
  });

  it('anchors a pattern the schema left unanchored', async () => {
    const schema: ResolvedAddressSchema = {
      ...US,
      fields: US.fields.map((field) =>
        field.id === 'postal_code'
          ? { ...field, pattern: { regex: '\\d{5}', messageKey: '${field} is invalid' } }
          : field
      )
    };
    expect(
      (await validateAddressAgainstSchema({ ...validUS, postal_code: '940431' }, schema)).valid
    ).toBe(false);
    expect(
      (await validateAddressAgainstSchema({ ...validUS, postal_code: '94043' }, schema)).valid
    ).toBe(true);
  });

  it('does not run the pattern on an empty optional value', async () => {
    const schema: ResolvedAddressSchema = {
      ...US,
      fields: US.fields.map((field) =>
        field.id === 'postal_code' ? { ...field, required: false } : field
      )
    };
    const result = await validateAddressAgainstSchema(
      { ...validUS, postal_code: '' },
      schema
    );
    expect(result.valid).toBe(true);
  });

  it('validates telephone with the schema pattern (the core rule by default)', async () => {
    expect(
      (await validateAddressAgainstSchema({ ...validUS, telephone: '+84 912 345 678' }, US)).valid
    ).toBe(true);
    const result = await validateAddressAgainstSchema(
      { ...validUS, telephone: 'abc' },
      US
    );
    expect(codesOf(result.errors)).toEqual(['telephone:pattern']);
    expect(result.errors[0].message).toBe('Telephone is invalid');
  });

  it('passes an HK address without postal code or district that fails as US', async () => {
    const hk: AddressRow = {
      recipient: 'Chan Tai Man',
      telephone: '+852 2345 6789',
      address_line_1: '1 Nathan Road',
      administrative_area: 'Kowloon',
      country: 'HK'
    };
    expect((await validateAddressAgainstSchema(hk, HK)).valid).toBe(true);
    const asUS = await validateAddressAgainstSchema({ ...hk, country: 'US' }, US);
    expect(codesOf(asUS.errors)).toEqual([
      'locality:required',
      'postal_code:required'
    ]);
  });
});

describe('validateAddressAgainstSchema — regions', () => {
  it('reports region_invalid when the key is not active', async () => {
    isActiveRegionKey.mockResolvedValue(false);
    const result = await validateAddressAgainstSchema(validUS, US);
    expect(result.errors).toEqual([
      {
        field: 'administrative_area',
        code: 'region_invalid',
        message: 'State is not a valid region'
      }
    ]);
    expect(isActiveRegionKey).toHaveBeenCalledWith(
      'US',
      'administrative_area',
      'US-CA',
      []
    );
  });

  it('checks only enumerated levels (HK district is free text)', async () => {
    await validateAddressAgainstSchema(
      {
        recipient: 'Chan Tai Man',
        telephone: '+852 2345 6789',
        address_line_1: '1 Nathan Road',
        locality: 'Yau Tsim Mong',
        administrative_area: 'Kowloon',
        country: 'HK'
      },
      HK
    );
    expect(isActiveRegionKey).toHaveBeenCalledTimes(1);
    expect(isActiveRegionKey).toHaveBeenCalledWith(
      'HK',
      'administrative_area',
      'Kowloon',
      []
    );
  });

  it('builds the parent path from the outer enumerated levels', async () => {
    const result = await validateAddressAgainstSchema(
      {
        recipient: '李雷',
        telephone: '+86 10 1234 5678',
        address_line_1: '1 Street',
        dependent_locality: 'Tianhe',
        locality: 'Guangzhou',
        administrative_area: 'CN-GD',
        country: 'CN'
      },
      CN
    );
    expect(result.valid).toBe(true);
    expect(isActiveRegionKey.mock.calls).toEqual([
      ['CN', 'dependent_locality', 'Tianhe', ['CN-GD', 'Guangzhou']],
      ['CN', 'locality', 'Guangzhou', ['CN-GD']],
      ['CN', 'administrative_area', 'CN-GD', []]
    ]);
  });

  it('skips the region check for an empty optional level', async () => {
    await validateAddressAgainstSchema(
      { ...validUS, administrative_area: '' },
      { ...US, fields: US.fields.map((x) => (x.id === 'administrative_area' ? { ...x, required: false } : x)) }
    );
    expect(isActiveRegionKey).not.toHaveBeenCalled();
  });
});

describe('validateAddressAgainstSchema — unknown fields and extras', () => {
  it('rejects keys outside the vocabulary and ignores metadata and shared columns', async () => {
    const result = await validateAddressAgainstSchema(
      {
        ...validUS,
        province: 'CA',
        uuid: 'a-b-c',
        customer_id: 7,
        is_default: 1,
        created_at: '2026-01-01',
        extra: { vat_id: 'DE1' },
        given_name: null,
        dependent_locality: null,
        sorting_code: null
      },
      US
    );
    expect(result.errors).toEqual([
      {
        field: 'province',
        code: 'unknown_field',
        message: 'province is not a known address field'
      }
    ]);
  });

  it('knows extras registered for the country on any surface', async () => {
    getAddressExtras.mockReturnValue([{ id: 'vat_id' }]);
    const result = await validateAddressAgainstSchema(
      { ...validUS, vat_id: 'DE123456789' },
      US
    );
    expect(result.valid).toBe(true);
    expect(getAddressExtras).toHaveBeenCalledWith('US');
  });

  it('lets knownExtraIds override the registry lookup', async () => {
    const without = await validateAddressAgainstSchema(
      { ...validUS, pickup_point: 'PP-1' },
      US
    );
    expect(codesOf(without.errors)).toEqual(['pickup_point:unknown_field']);
    getAddressExtras.mockClear();
    const withIds = await validateAddressAgainstSchema(
      { ...validUS, pickup_point: 'PP-1' },
      US,
      { knownExtraIds: ['pickup_point'] }
    );
    expect(withIds.valid).toBe(true);
    expect(getAddressExtras).not.toHaveBeenCalled();
  });

  const WITH_EXTRAS: ResolvedAddressSchema = {
    ...US,
    fields: [
      ...US.fields,
      f({
        id: 'customs_code',
        labelType: 'extra',
        label: 'Customs code',
        required: true,
        pattern: { regex: '^P[0-9]{12}$', messageKey: '${field} is not a valid customs code' },
        row: 6
      }),
      f({ id: 'floor', type: 'number', labelType: 'extra', label: 'Floor', row: 7 })
    ]
  };

  it('type-checks extras against their declaration', async () => {
    const bad = await validateAddressAgainstSchema(
      { ...validUS, customs_code: 123, floor: '3' },
      WITH_EXTRAS
    );
    expect(bad.errors).toEqual([
      { field: 'customs_code', code: 'type', message: 'Customs code has the wrong type' },
      { field: 'floor', code: 'type', message: 'Floor has the wrong type' }
    ]);
    const good = await validateAddressAgainstSchema(
      { ...validUS, customs_code: 'P123456789012', floor: 3 },
      WITH_EXTRAS
    );
    expect(good.valid).toBe(true);
  });

  it('reads an extra from `extra` when it is not a top-level key', async () => {
    const stored = await validateAddressAgainstSchema(
      { ...validUS, extra: { customs_code: 'P123456789012' } },
      WITH_EXTRAS
    );
    expect(stored.valid).toBe(true);
    const missing = await validateAddressAgainstSchema(validUS, WITH_EXTRAS);
    expect(codesOf(missing.errors)).toEqual(['customs_code:required']);
    const badPattern = await validateAddressAgainstSchema(
      { ...validUS, extra: { customs_code: 'nope' } },
      WITH_EXTRAS
    );
    expect(badPattern.errors).toEqual([
      {
        field: 'customs_code',
        code: 'pattern',
        message: 'Customs code is not a valid customs code'
      }
    ]);
  });

  it('rejects a non-string value on a text column', async () => {
    const result = await validateAddressAgainstSchema(
      { ...validUS, postal_code: 94043 as unknown as string },
      US
    );
    expect(result.errors).toEqual([
      { field: 'postal_code', code: 'type', message: 'ZIP code has the wrong type' }
    ]);
  });
});

describe('validateAddressAgainstSchema — split names (§ 3.12)', () => {
  const { recipient: _omit, ...withoutRecipient } = validUS;

  it('requires both parts on create and never the recipient', async () => {
    const result = await validateAddressAgainstSchema(
      { ...withoutRecipient, recipient: 'Jane Smith' },
      SPLIT
    );
    expect(codesOf(result.errors)).toEqual([
      'given_name:required',
      'family_name:required'
    ]);
    const ok = await validateAddressAgainstSchema(
      { ...withoutRecipient, given_name: 'Jane', family_name: 'Smith' },
      SPLIT
    );
    expect(ok.valid).toBe(true);
  });

  it('lets a legacy row update that touches only the telephone pass', async () => {
    const previous: AddressRow = { ...validUS, given_name: null, family_name: null };
    const merged: AddressRow = { ...previous, telephone: '+1 650 253 0001' };
    const result = await validateAddressAgainstSchema(merged, SPLIT, { previous });
    expect(result.valid).toBe(true);
  });

  it('requires the parts again when a name field changes without them', async () => {
    const previous: AddressRow = { ...validUS, given_name: null, family_name: null };
    const result = await validateAddressAgainstSchema(
      { ...previous, recipient: 'Janet Smith' },
      SPLIT,
      { previous }
    );
    expect(codesOf(result.errors)).toEqual([
      'given_name:required',
      'family_name:required'
    ]);
    const withParts = await validateAddressAgainstSchema(
      { ...previous, recipient: 'Janet Smith', given_name: 'Janet', family_name: 'Smith' },
      SPLIT,
      { previous }
    );
    expect(withParts.valid).toBe(true);
  });

  it('honours a relaxed part on the schema', async () => {
    const relaxed: ResolvedAddressSchema = {
      ...SPLIT,
      fields: SPLIT.fields.map((x) => (x.id === 'family_name' ? { ...x, required: false } : x))
    };
    const result = await validateAddressAgainstSchema(
      { ...withoutRecipient, given_name: 'Madonna' },
      relaxed
    );
    expect(result.valid).toBe(true);
  });

  it('keeps recipient required in single mode', async () => {
    const result = await validateAddressAgainstSchema(withoutRecipient, US);
    expect(codesOf(result.errors)).toEqual(['recipient:required']);
  });
});

describe('validateAddressAgainstSchema — country (§ 3.13)', () => {
  it('requires the country', async () => {
    const result = await validateAddressAgainstSchema(
      { ...validUS, country: '' },
      US
    );
    expect(result.errors).toEqual([
      { field: 'country', code: 'required', message: 'Country is required' }
    ]);
    expect(isCountryAllowed).not.toHaveBeenCalled();
  });

  it('reports country_not_allowed from the given settings, surface and zones', async () => {
    isCountryAllowed.mockReturnValue(false);
    const settings: AddressSettings = { ...SETTINGS, sellToCountries: ['DE', 'FR'] };
    const result = await validateAddressAgainstSchema(validUS, US, {
      settings,
      surface: 'billing',
      zoneCountries: ['US', 'CA']
    });
    expect(result.errors).toEqual([
      { field: 'country', code: 'country_not_allowed', message: 'We do not sell to US' }
    ]);
    expect(isCountryAllowed).toHaveBeenCalledWith('US', settings, 'billing', ['US', 'CA']);
  });

  it('falls back to the runtime settings, zone countries and the account surface', async () => {
    getZoneCountries.mockReturnValue(['US']);
    await validateAddressAgainstSchema(validUS, US);
    expect(isCountryAllowed).toHaveBeenCalledWith('US', SETTINGS, 'account', ['US']);
  });

  it('upper-cases the code for the check but echoes the stored value', async () => {
    isCountryAllowed.mockReturnValue(false);
    const result = await validateAddressAgainstSchema({ ...validUS, country: 'us' }, US);
    expect(isCountryAllowed.mock.calls[0][0]).toBe('US');
    expect(result.errors[0].message).toBe('We do not sell to us');
  });
});

describe('addAddressValidationRule', () => {
  it('awaits an async rule and returns its field-targeted translated error', async () => {
    addAddressValidationRule({
      id: 'no_po_box',
      func: async (address) => {
        await new Promise((resolve) => setTimeout(resolve, 1));
        return !/\bP\.?O\.? box\b/i.test(String(address.address_line_1 ?? ''));
      },
      error: {
        field: 'address_line_1',
        code: 'po_box',
        message: 'We cannot ship to a PO box (${field})'
      }
    });
    const ok = await validateAddressAgainstSchema(validUS, US);
    expect(ok.valid).toBe(true);
    const result = await validateAddressAgainstSchema(
      { ...validUS, address_line_1: 'PO Box 12' },
      US
    );
    expect(result.errors).toEqual([
      {
        field: 'address_line_1',
        code: 'po_box',
        message: 'We cannot ship to a PO box (Address)'
      }
    ]);
  });

  it('turns a thrown rule into rule_error', async () => {
    addAddressValidationRule({
      id: 'boom',
      func: () => {
        throw new Error('network');
      },
      error: { code: 'lookup', message: 'Address lookup failed' }
    });
    const result = await validateAddressAgainstSchema(validUS, US);
    expect(result.errors).toEqual([
      {
        field: undefined,
        code: 'rule_error',
        message: 'Address lookup failed (exception occurred)'
      }
    ]);
  });

  it('runs rules in registration order and replaces a duplicate id', async () => {
    const seen: string[] = [];
    addAddressValidationRule({
      id: 'first',
      func: () => {
        seen.push('first-original');
        return true;
      },
      error: { code: 'first', message: 'first' }
    });
    addAddressValidationRule({
      id: 'second',
      func: () => {
        seen.push('second');
        return false;
      },
      error: { code: 'second', message: 'second' }
    });
    addAddressValidationRule({
      id: 'first',
      func: () => {
        seen.push('first-replaced');
        return false;
      },
      error: { code: 'first', message: 'first' }
    });
    const result = await validateAddressAgainstSchema(validUS, US);
    expect(seen).toEqual(['first-replaced', 'second']);
    expect(result.errors.map((e) => e.code)).toEqual(['first', 'second']);
  });

  it('receives the address and the schema', async () => {
    const func = jest.fn(() => true);
    addAddressValidationRule({ id: 'spy', func, error: { code: 'spy', message: 'spy' } });
    await validateAddressAgainstSchema(validUS, US);
    expect(func).toHaveBeenCalledWith(validUS, US);
  });

  it('throws after the registry is locked', () => {
    isAddressRegistryLocked.mockReturnValue(true);
    expect(() =>
      addAddressValidationRule({
        id: 'late',
        func: () => true,
        error: { code: 'late', message: 'late' }
      })
    ).toThrow(
      "Cannot add address validation rule 'late' after bootstrap. Call addAddressValidationRule from your extension's bootstrap.ts."
    );
  });
});

describe('validateAddressAgainstSchema — translation and aggregation', () => {
  it('passes every message and label through opts.translate', async () => {
    const dictionary: Record<string, string> = {
      'ZIP code': 'Postleitzahl',
      '${field} is required': '${field} ist erforderlich',
      Country: 'Land',
      'We do not sell to ${country}': 'Wir liefern nicht nach ${country}'
    };
    const translate = jest.fn((text: string, values?: Record<string, string>) =>
      interpolate(dictionary[text] ?? text, values)
    );
    isCountryAllowed.mockReturnValue(false);
    const result = await validateAddressAgainstSchema(
      { ...validUS, postal_code: '' },
      US,
      { translate }
    );
    expect(result.errors.map((e) => e.message)).toEqual([
      'Postleitzahl ist erforderlich',
      'Wir liefern nicht nach US'
    ]);
    expect(runtimeTranslate).not.toHaveBeenCalled();
  });

  it('collects errors from every rule class in order', async () => {
    isCountryAllowed.mockReturnValue(false);
    isActiveRegionKey.mockResolvedValue(false);
    addAddressValidationRule({
      id: 'always',
      func: () => false,
      error: { field: 'telephone', code: 'custom', message: 'Custom ${field} rule' }
    });
    const result = await validateAddressAgainstSchema(
      { ...validUS, full_name: 'x', locality: '', postal_code: 'bad' },
      US
    );
    expect(codesOf(result.errors)).toEqual([
      'full_name:unknown_field',
      'locality:required',
      'administrative_area:region_invalid',
      'postal_code:pattern',
      'country:country_not_allowed',
      'telephone:custom'
    ]);
    expect(result.errors[5].message).toBe('Custom Telephone rule');
  });
});

describe('validateAddress', () => {
  it('resolves the schema for the upper-cased country with locale and surface', async () => {
    const result = await validateAddress(
      { ...validUS, country: ' us ' },
      { locale: 'de', surface: 'billing' }
    );
    expect(resolveAddressSchema).toHaveBeenCalledWith('US', 'de', { surface: 'billing' });
    expect(result.valid).toBe(true);
    expect(isCountryAllowed).toHaveBeenCalledWith('US', SETTINGS, 'billing', undefined);
  });

  it('resolves the DEFAULT schema for a missing country and still requires it', async () => {
    await validateAddress({ recipient: 'Jane' });
    expect(resolveAddressSchema).toHaveBeenCalledWith('', undefined, { surface: undefined });
  });

  it('forwards previous for the split-name rule', async () => {
    resolveAddressSchema.mockReturnValue(SPLIT);
    const previous: AddressRow = { ...validUS, given_name: null, family_name: null };
    const result = await validateAddress({ ...previous, telephone: '+1 650 253 0002' }, { previous });
    expect(result.valid).toBe(true);
    resolveAddressSchema.mockReturnValue(US);
  });
});
