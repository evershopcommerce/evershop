import { ADDRESS_STORE, addressFile, addressRow } from './addressFiles.js';
import { defineRule } from './rule.js';
import type { RuleExample } from './rule.js';

/**
 * The rules of the customer addresses file (§ 7.4, `ADR`). The core rules run
 * through the normalization seam and `validateAddress` (the account surface), and
 * every issue keeps the registry's field and code. Each rule is shown on a valid
 * US address with one cell changed.
 */
const VALIDATION_TEST = 'tests/unit/validate/customerAddressValidator.test.ts';

const withStore = (examples: RuleExample[]): RuleExample[] =>
  examples.map((example) => ({
    entity: 'customerAddress' as const,
    store: ADDRESS_STORE,
    ...example
  }));

const defineAddressRule = (
  definition: Parameters<typeof defineRule>[0] & {
    testedBy: 'example';
    examples: { pass: RuleExample[]; fail: RuleExample[] };
  }
) =>
  defineRule({
    ...definition,
    examples: {
      pass: withStore(definition.examples.pass),
      fail: withStore(definition.examples.fail)
    }
  });

const invalid = (field: string, rowNumber = 2) => ({
  code: 'ADDRESS_INVALID' as const,
  rowNumber,
  column: field
});

export const ADR_01 = defineAddressRule({
  id: 'ADR-01',
  entity: 'customerAddress',
  layer: 'R',
  source: 'engine',
  op: 'C',
  code: 'REFERENCE_NOT_FOUND',
  testedBy: 'example',
  summary: 'email names an existing customer (ignoring letter case).',
  examples: {
    pass: [
      {
        name: 'a customer of the store',
        file: addressFile(addressRow()),
        expect: []
      },
      {
        name: 'the e-mail in another letter case',
        file: addressFile(addressRow({ email: 'JANE.DOE@example.com' })),
        expect: []
      }
    ],
    fail: [
      {
        name: 'nobody has that e-mail',
        file: addressFile(addressRow({ email: 'nobody@example.com' })),
        expect: [{ code: 'REFERENCE_NOT_FOUND', rowNumber: 2, column: 'email' }]
      }
    ]
  }
});

export const ADR_02 = defineAddressRule({
  id: 'ADR-02',
  entity: 'customerAddress',
  layer: 'R',
  source: 'engine',
  op: 'C',
  code: 'INVALID_VALUE',
  testedBy: 'example',
  summary:
    'country is a code the registry knows. Core’s validator accepts any code (ZZ passes), so the engine refuses it.',
  examples: {
    pass: [
      { name: 'a country code', file: addressFile(addressRow()), expect: [] },
      {
        name: 'in lower case',
        file: addressFile(addressRow({ country: 'us' })),
        expect: []
      }
    ],
    fail: [
      {
        name: 'a code nobody has',
        file: addressFile(addressRow({ country: 'ZZ' })),
        expect: [{ code: 'INVALID_VALUE', rowNumber: 2, column: 'country' }]
      },
      {
        name: 'a country name instead of its code',
        file: addressFile(addressRow({ country: 'United States' })),
        expect: [{ code: 'INVALID_VALUE', rowNumber: 2, column: 'country' }]
      }
    ]
  }
});

export const ADR_03 = defineAddressRule({
  id: 'ADR-03',
  entity: 'customerAddress',
  layer: 'S',
  source: 'core',
  op: 'C',
  code: 'ADDRESS_INVALID',
  testedBy: 'example',
  summary:
    'Only the field names of the address registry: a column with an old name (full_name, address_1, city, province, postcode) is not read, so what it held is missing.',
  examples: {
    pass: [
      {
        name: 'the registry’s names',
        file: addressFile(addressRow()),
        expect: []
      }
    ],
    fail: [
      {
        name: 'the names of the old format',
        file:
          'email,full_name,address_1,city,province,postcode,country,telephone\n' +
          'jane.doe@example.com,Jane Doe,1 Market Street,San Francisco,CA,94105,US,415-555-0100\n',
        expect: [
          // 5 of the 8 columns are ignored
          { code: 'COLUMNS_IGNORED' },
          { code: 'UNKNOWN_COLUMN', column: 'full_name' },
          { code: 'UNKNOWN_COLUMN', column: 'address_1' },
          { code: 'UNKNOWN_COLUMN', column: 'city' },
          { code: 'UNKNOWN_COLUMN', column: 'province' },
          { code: 'UNKNOWN_COLUMN', column: 'postcode' },
          invalid('recipient'),
          invalid('address_line_1'),
          invalid('locality'),
          invalid('administrative_area'),
          invalid('postal_code')
        ]
      }
    ]
  }
});

export const ADR_04 = defineAddressRule({
  id: 'ADR-04',
  entity: 'customerAddress',
  layer: 'S',
  source: 'core',
  op: 'C',
  code: 'ADDRESS_INVALID',
  testedBy: 'example',
  summary:
    'The fields the country requires are present; the name is recipient (single format) or given_name and family_name (split format, which then compose recipient).',
  examples: {
    pass: [
      {
        name: 'Germany needs no region',
        file: addressFile(
          addressRow({
            recipient: 'Lukas Schmidt',
            address_line_1: 'Unter den Linden 77',
            address_line_2: '',
            locality: 'Berlin',
            administrative_area: '',
            postal_code: '10117',
            country: 'DE',
            telephone: '+4930123456'
          })
        ),
        expect: []
      },
      {
        name: 'the name in two parts: recipient is composed from them',
        file: addressFile(
          addressRow({ recipient: '', given_name: 'Jane', family_name: 'Doe' })
        ),
        expect: []
      }
    ],
    fail: [
      {
        name: 'no recipient',
        file: addressFile(addressRow({ recipient: '' })),
        expect: [invalid('recipient')]
      },
      {
        name: 'no street',
        file: addressFile(addressRow({ address_line_1: '' })),
        expect: [invalid('address_line_1')]
      },
      {
        name: 'no city',
        file: addressFile(addressRow({ locality: '' })),
        expect: [invalid('locality')]
      },
      {
        name: 'no country',
        file: addressFile(addressRow({ country: '' })),
        expect: [invalid('country')]
      }
    ]
  }
});

export const ADR_05 = defineRule({
  id: 'ADR-05',
  entity: 'customerAddress',
  layer: 'S',
  source: 'core',
  op: 'C',
  code: 'ADDRESS_INVALID',
  testedBy: 'runner',
  test: VALIDATION_TEST,
  summary:
    'Values are strings. Every cell of a CSV file is text, so this cannot fail; the test shows that the writer sends text only.'
});

export const ADR_06 = defineAddressRule({
  id: 'ADR-06',
  entity: 'customerAddress',
  layer: 'S',
  source: 'core',
  op: 'C',
  code: 'ADDRESS_INVALID',
  testedBy: 'example',
  summary:
    'postal_code and telephone match the country’s pattern; telephone is required by default, and a national number is made E.164 first.',
  examples: {
    pass: [
      {
        name: 'a national number (it becomes +14155550100)',
        file: addressFile(addressRow({ telephone: '(415) 555-0100' })),
        expect: []
      },
      {
        name: 'a ZIP+4',
        file: addressFile(addressRow({ postal_code: '94105-1234' })),
        expect: []
      }
    ],
    fail: [
      {
        name: 'a postal code of the wrong shape',
        file: addressFile(addressRow({ postal_code: 'ABC' })),
        expect: [invalid('postal_code')]
      },
      {
        name: 'no postal code',
        file: addressFile(addressRow({ postal_code: '' })),
        expect: [invalid('postal_code')]
      },
      {
        name: 'a telephone that is not a number',
        file: addressFile(addressRow({ telephone: 'call me' })),
        expect: [invalid('telephone')]
      },
      {
        name: 'no telephone',
        file: addressFile(addressRow({ telephone: '' })),
        expect: [invalid('telephone')]
      }
    ]
  }
});

export const ADR_07 = defineAddressRule({
  id: 'ADR-07',
  entity: 'customerAddress',
  layer: 'S',
  source: 'core',
  op: 'C',
  code: 'ADDRESS_INVALID',
  testedBy: 'example',
  summary:
    'administrative_area, locality and dependent_locality that the country lists are keys of its region list (US-CA), not names.',
  examples: {
    pass: [
      {
        name: 'a region key',
        file: addressFile(addressRow({ administrative_area: 'US-NY' })),
        expect: []
      }
    ],
    fail: [
      {
        name: 'the name of the region',
        file: addressFile(addressRow({ administrative_area: 'California' })),
        expect: [invalid('administrative_area')]
      },
      {
        name: 'a key of another country',
        file: addressFile(addressRow({ administrative_area: 'JP-13' })),
        expect: [invalid('administrative_area')]
      }
    ]
  }
});

export const ADR_08 = defineAddressRule({
  id: 'ADR-08',
  entity: 'customerAddress',
  layer: 'S',
  source: 'core',
  op: 'C',
  code: 'ADDRESS_INVALID',
  testedBy: 'example',
  summary: 'The country is one the store sells to (the sell-to setting).',
  examples: {
    pass: [
      {
        name: 'a country on the list',
        store: { ...ADDRESS_STORE, addressSellTo: ['US', 'GB'] },
        file: addressFile(addressRow()),
        expect: []
      }
    ],
    fail: [
      {
        name: 'a country that is not on the list',
        store: { ...ADDRESS_STORE, addressSellTo: ['GB'] },
        file: addressFile(addressRow()),
        expect: [invalid('country')]
      }
    ]
  }
});

export const ADR_09 = defineRule({
  id: 'ADR-09',
  entity: 'customerAddress',
  layer: 'S',
  source: 'core',
  op: 'C',
  code: 'ADDRESS_INVALID',
  testedBy: 'runner',
  test: VALIDATION_TEST,
  summary:
    'The rules that an extension added with addAddressValidationRule run too, in the order they were registered.'
});

export const ADR_10 = defineAddressRule({
  id: 'ADR-10',
  entity: 'customerAddress',
  layer: 'C',
  source: 'engine',
  op: 'C',
  code: 'INVALID_JSON',
  alsoCodes: ['INVALID_VALUE'],
  testedBy: 'example',
  summary:
    'extra is a JSON object, and its keys are the extra fields registered for the country (core would keep any key).',
  examples: {
    pass: [
      {
        name: 'a key the country registers',
        store: { ...ADDRESS_STORE, addressExtras: { US: ['gift_note'] } },
        file: addressFile(
          addressRow({ extra: '{"gift_note":"Leave at the door"}' })
        ),
        expect: []
      },
      {
        name: 'an empty object',
        file: addressFile(addressRow({ extra: '{}' })),
        expect: []
      }
    ],
    fail: [
      {
        name: 'not JSON',
        file: addressFile(addressRow({ extra: '{gift_note: 1}' })),
        expect: [{ code: 'INVALID_JSON', rowNumber: 2, column: 'extra' }]
      },
      {
        name: 'JSON that is not an object',
        file: addressFile(addressRow({ extra: '["a"]' })),
        expect: [{ code: 'INVALID_VALUE', rowNumber: 2, column: 'extra' }]
      },
      {
        name: 'a key that no extra field has',
        file: addressFile(addressRow({ extra: '{"province":"CA"}' })),
        expect: [{ code: 'INVALID_VALUE', rowNumber: 2, column: 'extra' }]
      }
    ]
  }
});

export const ADR_11 = defineAddressRule({
  id: 'ADR-11',
  entity: 'customerAddress',
  layer: 'C',
  source: 'engine',
  op: 'C',
  code: 'INVALID_VALUE',
  testedBy: 'example',
  summary: 'is_default is 0 or 1 (also true and false).',
  examples: {
    pass: ['0', '1', 'true', 'FALSE', ''].map((is_default) => ({
      name: `is_default “${is_default}”`,
      file: addressFile(addressRow({ is_default })),
      expect: []
    })),
    fail: ['yes', '2'].map((is_default) => ({
      name: `is_default “${is_default}”`,
      file: addressFile(addressRow({ is_default })),
      expect: [
        { code: 'INVALID_VALUE' as const, rowNumber: 2, column: 'is_default' }
      ]
    }))
  }
});

export const ADR_12 = defineAddressRule({
  id: 'ADR-12',
  entity: 'customerAddress',
  layer: 'X',
  source: 'engine',
  op: 'C',
  code: 'DUPLICATE_VALUE',
  testedBy: 'example',
  summary:
    'More than one default address for a customer in the file: the last one wins (a warning).',
  examples: {
    pass: [
      {
        name: 'one default for each customer',
        store: {
          customers: [
            { email: 'jane.doe@example.com' },
            { email: 'john.smith@example.com' }
          ]
        },
        file: addressFile(
          addressRow(),
          addressRow({ is_default: '0' }),
          addressRow({ email: 'john.smith@example.com' })
        ),
        expect: []
      },
      {
        name: 'the same customer twice, no default at all',
        file: addressFile(
          addressRow({ is_default: '0' }),
          addressRow({ is_default: '' })
        ),
        expect: []
      }
    ],
    fail: [
      {
        name: 'two defaults for one customer (any letter case)',
        file: addressFile(
          addressRow(),
          addressRow({ email: 'Jane.Doe@example.com' })
        ),
        expect: [
          { code: 'DUPLICATE_VALUE', rowNumber: 3, column: 'is_default' }
        ]
      }
    ]
  }
});

export const ADDRESS_RULES = [
  ADR_01,
  ADR_02,
  ADR_03,
  ADR_04,
  ADR_05,
  ADR_06,
  ADR_07,
  ADR_08,
  ADR_09,
  ADR_10,
  ADR_11,
  ADR_12
];
