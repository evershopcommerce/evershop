import { afterEach, describe, expect, it } from '@jest/globals';
import {
  addAddressValidationRule,
  __resetAddressValidationRulesForTests
} from '../../../../../lib/address/validate.js';
import {
  registerAddressField,
  __resetAddressExtrasForTests
} from '../../../../../lib/address/extras.js';
import {
  configureAddressRuntime,
  resetAddressRuntime
} from '../../../../../lib/address/runtime.js';
import {
  ADDRESS_HEADER,
  ADDRESS_STORE,
  addressFile,
  addressRow
} from '../../../services/rules/addressFiles.js';
import { validateAddresses } from '../helpers/runValidation.js';

/**
 * The address validator beyond the examples of the rules: the cases that need the
 * address library set up (split names, a rule an extension added), what it counts
 * and asks, and how it places core's errors.
 */
afterEach(() => {
  __resetAddressValidationRulesForTests();
  resetAddressRuntime();
});

const brief = (
  issues: Array<{ code: string; rowNumber?: number; column?: string }>
) => issues.map((i) => [i.code, i.rowNumber, i.column]);

describe('validateAddresses: counts and questions', () => {
  it('counts every row as an address to add, and asks the store once for each batch of customers', async () => {
    const people = Array.from({ length: 25 }, (_, i) => `c${i}@example.com`);
    const result = await validateAddresses(
      addressFile(...people.map((email) => addressRow({ email }))),
      {
        store: { customers: people.map((email) => ({ email })) },
        batchSize: 10
      }
    );
    expect(result.issues).toEqual([]);
    expect(result.summary).toMatchObject({ createRows: 25, updateRows: 0 });
    expect(result.lookup.calls.customers).toBe(3);
    expect(result.lookup.calls.addressRules).toBe(1);
  });

  it('asks for a customer once, however many addresses the file gives it', async () => {
    const rows = Array.from({ length: 25 }, (_, i) =>
      addressRow({ address_line_1: `${i + 1} Market Street`, is_default: '0' })
    );
    const result = await validateAddresses(addressFile(...rows), {
      store: ADDRESS_STORE,
      batchSize: 10
    });
    expect(result.issues).toEqual([]);
    expect(result.lookup.calls.customers).toBe(1);
  });

  it('puts the errors of core on the column of each field, in the order core gives them, with its field and code', async () => {
    const result = await validateAddresses(
      addressFile(
        addressRow({
          postal_code: 'ABC',
          administrative_area: 'California',
          telephone: ''
        })
      ),
      { store: ADDRESS_STORE }
    );
    // The order is the one core gives (the order of the fields of the country).
    expect(brief(result.issues)).toEqual([
      ['ADDRESS_INVALID', 2, 'telephone'],
      ['ADDRESS_INVALID', 2, 'administrative_area'],
      ['ADDRESS_INVALID', 2, 'postal_code']
    ]);
    expect(result.issues.map((i) => i.params)).toEqual([
      { field: 'telephone', reason: 'required' },
      { field: 'administrative_area', reason: 'region_invalid' },
      { field: 'postal_code', reason: 'pattern' }
    ]);
    expect(result.issues[0].message.length).toBeGreaterThan(5);
  });

  it('does not run the rest of the rules on a country that is not a country, and still says the e-mail is unknown', async () => {
    const result = await validateAddresses(
      addressFile(
        addressRow({
          email: 'nobody@example.com',
          country: 'ZZ',
          postal_code: 'ABC'
        })
      ),
      { store: ADDRESS_STORE }
    );
    expect(brief(result.issues)).toEqual([
      ['REFERENCE_NOT_FOUND', 2, 'email'],
      ['INVALID_VALUE', 2, 'country']
    ]);
  });

  it('asks nothing about extras when there are none, and names the key and the country when one is not registered', async () => {
    const result = await validateAddresses(
      addressFile(addressRow({ extra: '{"a":1,"gift":2}' })),
      { store: { ...ADDRESS_STORE, addressExtras: { US: ['gift'] } } }
    );
    expect(brief(result.issues)).toEqual([['INVALID_VALUE', 2, 'extra']]);
    expect(result.issues[0].params).toMatchObject({
      reason: 'unknown_extra',
      key: 'a'
    });
    expect(result.issues[0].message).toContain('"a"');
    expect(result.issues[0].message).toContain('US');
  });

  it('says what is wrong with extra: not JSON, not an object (not as an unknown key), or no country to judge the keys by', async () => {
    const store = { ...ADDRESS_STORE, addressExtras: { US: ['gift'] } };
    const notObject = await validateAddresses(
      addressFile(addressRow({ extra: '["gift"]' })),
      { store }
    );
    expect(notObject.issues.map((i) => [i.code, i.params])).toEqual([
      ['INVALID_VALUE', { reason: 'not_object' }]
    ]);
    const noJson = await validateAddresses(
      addressFile(addressRow({ extra: '{gift' })),
      { store }
    );
    expect(noJson.issues.map((i) => i.code)).toEqual(['INVALID_JSON']);
    // Without a country the keys cannot be judged: only the country is missing.
    const noCountry = await validateAddresses(
      addressFile(addressRow({ country: '', extra: '{"gift":"x"}' })),
      { store }
    );
    expect(brief(noCountry.issues)).toEqual([
      ['ADDRESS_INVALID', 2, 'country']
    ]);
  });

  it('places the error about an extra field on the extra column', async () => {
    registerAddressField({
      id: 'gift_note',
      type: 'text',
      label: 'Gift note',
      required: true,
      countries: ['US']
    });
    try {
      const store = { ...ADDRESS_STORE, addressExtras: { US: ['gift_note'] } };
      const missing = await validateAddresses(addressFile(addressRow()), {
        store
      });
      expect(brief(missing.issues)).toEqual([['ADDRESS_INVALID', 2, 'extra']]);
      expect(missing.issues[0].params).toEqual({
        field: 'gift_note',
        reason: 'required'
      });
      const given = await validateAddresses(
        addressFile(addressRow({ extra: '{"gift_note":"Door"}' })),
        { store }
      );
      expect(given.issues).toEqual([]);
    } finally {
      __resetAddressExtrasForTests();
    }
  });

  it('reads text as REST does (tags escaped) and trims it', async () => {
    const result = await validateAddresses(
      addressFile(addressRow({ recipient: '  <b>Jane</b>  ' })),
      { store: ADDRESS_STORE }
    );
    expect(result.issues).toEqual([]);
  });

  it('accepts a file with only the columns it needs, in any order', async () => {
    const result = await validateAddresses(
      'country,telephone,postal_code,locality,address_line_1,recipient,administrative_area,email\nUS,+14155550100,94105,San Francisco,1 Market Street,Jane Doe,US-CA,jane.doe@example.com\n',
      { store: ADDRESS_STORE }
    );
    expect(result.issues).toEqual([]);
  });

  it('warns about a column it does not know and ignores it', async () => {
    const result = await validateAddresses(
      `${ADDRESS_HEADER},colour\n${addressRow()},red\n`,
      { store: ADDRESS_STORE }
    );
    expect(brief(result.issues)).toEqual([
      ['UNKNOWN_COLUMN', undefined, 'colour']
    ]);
    expect(result.issues[0].severity).toBe('warning');
  });
});

describe('validateAddresses: with the address library set up (ADR-04, ADR-05, ADR-09)', () => {
  it('in the split name format, the parts are required and recipient is not (ADR-04)', async () => {
    configureAddressRuntime({
      getSettings: () => ({
        nameFormat: 'split',
        telephone: 'required',
        organization: 'optional',
        addressLine2: 'shown',
        addressLine3: 'disabled',
        required: {},
        defaultCountry: 'store',
        sellToCountries: 'all'
      })
    });
    const whole = await validateAddresses(addressFile(addressRow()), {
      store: ADDRESS_STORE
    });
    expect(
      brief(whole.issues)
        .map((i) => i[2])
        .sort()
    ).toEqual(['family_name', 'given_name']);
    const parts = await validateAddresses(
      addressFile(
        addressRow({ recipient: '', given_name: 'Jane', family_name: 'Doe' })
      ),
      { store: ADDRESS_STORE }
    );
    expect(parts.issues).toEqual([]);
  });

  it('runs a rule that an extension added, after the rules of the country (ADR-09)', async () => {
    addAddressValidationRule({
      id: 'no-po-box',
      func: (address) => !/po box/i.test(String(address.address_line_1)),
      error: {
        field: 'address_line_1',
        code: 'po_box',
        message: 'We do not deliver to a PO box.'
      }
    });
    const result = await validateAddresses(
      addressFile(
        addressRow({ address_line_1: 'PO Box 12', is_default: '0' }),
        addressRow({ address_line_1: '1 Market Street', is_default: '0' })
      ),
      { store: ADDRESS_STORE }
    );
    expect(brief(result.issues)).toEqual([
      ['ADDRESS_INVALID', 2, 'address_line_1']
    ]);
    expect(result.issues[0].params).toEqual({
      field: 'address_line_1',
      reason: 'po_box'
    });
    expect(result.issues[0].message).toBe('We do not deliver to a PO box.');
  });

  it('writes the national number as E.164 before it judges it, for each country (ADR-06)', async () => {
    const result = await validateAddresses(
      addressFile(
        addressRow({ telephone: '415 555 0100' }),
        addressRow({
          recipient: 'Lukas Schmidt',
          address_line_1: 'Unter den Linden 77',
          address_line_2: '',
          locality: 'Berlin',
          administrative_area: '',
          postal_code: '10117',
          country: 'de',
          telephone: '030 123456'
        })
      ),
      { store: ADDRESS_STORE }
    );
    expect(result.issues.filter((i) => i.severity === 'error')).toEqual([]);
  });
});

describe('validateAddresses: more than one default (ADR-12)', () => {
  it('warns at every default after the first of a customer, and says which row made it', async () => {
    const result = await validateAddresses(
      addressFile(
        addressRow(),
        addressRow(),
        addressRow({ is_default: '0' }),
        addressRow()
      ),
      { store: ADDRESS_STORE }
    );
    expect(brief(result.issues)).toEqual([
      ['DUPLICATE_VALUE', 3, 'is_default'],
      ['DUPLICATE_VALUE', 5, 'is_default']
    ]);
    expect(result.issues[0].severity).toBe('warning');
    expect(result.issues[0].params).toEqual({ firstRow: 2 });
    expect(result.issues[0].message).toContain('Row 2');
  });
});
