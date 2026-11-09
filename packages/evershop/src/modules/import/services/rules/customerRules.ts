import {
  CUSTOMER_STORE,
  CUSTOMER_STORE_WITH_JANE,
  customerFile,
  customerRow,
  SAMPLE_HASH
} from './customerFiles.js';
import { defineRule } from './rule.js';
import type { RuleExample } from './rule.js';

/**
 * The rules of the customers file (§ 7.4, `CUS`). Each is shown on a valid file
 * with one cell changed. CUS-08 and CUS-10 are behaviours of the writer and are
 * proven by its test.
 */
const WRITER_TEST = 'tests/unit/write/customerWriter.test.ts';

const withStore = (examples: RuleExample[]): RuleExample[] =>
  examples.map((example) => ({
    entity: 'customer' as const,
    store: CUSTOMER_STORE,
    ...example
  }));

const defineCustomerRule = (
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

const invalid = (column: string, rowNumber = 2) => ({
  code: 'INVALID_VALUE' as const,
  rowNumber,
  column
});

export const CUS_01 = defineCustomerRule({
  id: 'CUS-01',
  entity: 'customer',
  layer: 'C',
  source: 'core',
  op: 'B',
  code: 'INVALID_VALUE',
  testedBy: 'example',
  summary:
    'email is a valid address (the format of core’s schema), at most 254 characters.',
  examples: {
    pass: [
      {
        name: 'an ordinary address',
        file: customerFile(customerRow({ email: 'jane.doe@example.com' }))
      },
      {
        name: 'a plus tag and a sub-domain',
        file: customerFile(
          customerRow({ email: 'jane+shop@mail.example.co.uk' })
        )
      },
      {
        name: 'upper case',
        file: customerFile(customerRow({ email: 'Jane.Doe@Example.COM' }))
      }
    ].map((example) => ({ ...example, expect: [] })),
    fail: [
      ['no @', 'jane.doe'],
      ['nothing after the @', 'jane@'],
      ['nothing before the @', '@example.com'],
      ['a domain without a dot', 'jane@example'],
      ['a space', 'jane doe@example.com'],
      ['two dots in a row', 'jane..doe@example.com'],
      ['a dot at the start', '.jane@example.com'],
      ['a hyphen at the start of a label', 'jane@-example.com'],
      ['255 characters', `${'a'.repeat(243)}@example.com`]
    ].map(([name, email]) => ({
      name: `${name}`,
      file: customerFile(customerRow({ email })),
      expect: [invalid('email')]
    }))
  }
});

export const CUS_02 = defineCustomerRule({
  id: 'CUS-02',
  entity: 'customer',
  layer: 'S',
  source: 'core',
  op: 'C',
  code: 'MISSING_REQUIRED',
  testedBy: 'example',
  summary: 'Create requires full_name.',
  examples: {
    pass: [
      {
        name: 'an update needs nothing but the key',
        store: CUSTOMER_STORE_WITH_JANE,
        file: customerFile(
          customerRow({ full_name: '', status: '', group: '' })
        ),
        expect: []
      }
    ],
    fail: [
      {
        name: 'a new customer without a name',
        file: customerFile(customerRow({ full_name: '' })),
        expect: [
          { code: 'MISSING_REQUIRED', rowNumber: 2, column: 'full_name' }
        ]
      }
    ]
  }
});

export const CUS_03 = defineCustomerRule({
  id: 'CUS-03',
  entity: 'customer',
  layer: 'C',
  source: 'core',
  op: 'B',
  code: 'INVALID_VALUE',
  testedBy: 'example',
  summary: 'status is 0 or 1 (also true and false, ALL-10).',
  examples: {
    pass: ['0', '1', 'true', 'FALSE'].map((status) => ({
      name: `status ${status}`,
      file: customerFile(customerRow({ status })),
      expect: []
    })),
    fail: ['2', 'yes', '-1'].map((status) => ({
      name: `status ${status}`,
      file: customerFile(customerRow({ status })),
      expect: [invalid('status')]
    }))
  }
});

export const CUS_04 = defineCustomerRule({
  id: 'CUS-04',
  entity: 'customer',
  layer: 'R',
  source: 'engine',
  op: 'B',
  code: 'REFERENCE_NOT_FOUND',
  testedBy: 'example',
  summary:
    'group (a name, ignoring letter case) is a customer group of the store; blank means the default group. A name that two groups have is ALL-21.',
  examples: {
    pass: [
      {
        name: 'a group of the store',
        file: customerFile(customerRow({ group: 'Wholesale' })),
        expect: []
      },
      {
        name: 'another letter case',
        file: customerFile(customerRow({ group: 'wHOLEsale' })),
        expect: []
      },
      {
        name: 'blank: the default group',
        file: customerFile(customerRow({ group: '' })),
        expect: []
      }
    ],
    fail: [
      {
        name: 'a group the store does not have',
        file: customerFile(customerRow({ group: 'VIP' })),
        expect: [{ code: 'REFERENCE_NOT_FOUND', rowNumber: 2, column: 'group' }]
      }
    ]
  }
});

export const CUS_05 = defineCustomerRule({
  id: 'CUS-05',
  entity: 'customer',
  layer: 'S',
  source: 'core',
  op: 'C',
  code: 'INVALID_VALUE',
  testedBy: 'example',
  summary:
    'password passes the password rules of the store: at least 6 characters, and any rule an extension added.',
  examples: {
    pass: [
      {
        name: 'six characters',
        file: customerFile(customerRow({ password: 'abc123' })),
        expect: []
      },
      {
        name: 'a space is a character of the password',
        file: customerFile(customerRow({ password: ' abc12' })),
        expect: []
      }
    ],
    fail: [
      {
        name: 'five characters',
        file: customerFile(customerRow({ password: 'abc12' })),
        expect: [invalid('password')]
      },
      {
        name: 'a store that wants ten',
        store: { ...CUSTOMER_STORE, passwordMinLength: 10 },
        file: customerFile(customerRow({ password: 'abc123' })),
        expect: [invalid('password')]
      }
    ]
  }
});

export const CUS_06 = defineCustomerRule({
  id: 'CUS-06',
  entity: 'customer',
  layer: 'C',
  source: 'engine',
  op: 'C',
  code: 'INVALID_VALUE',
  testedBy: 'example',
  summary:
    'password_hash has the shape of a bcrypt hash ($2a$, $2b$ or $2y$, a cost from 04 to 31, 60 characters).',
  examples: {
    pass: [
      {
        name: 'a bcrypt hash',
        file: customerFile(customerRow({ password_hash: SAMPLE_HASH })),
        expect: []
      },
      {
        name: 'the $2y$ prefix of PHP',
        file: customerFile(
          customerRow({ password_hash: SAMPLE_HASH.replace('$2a$', '$2y$') })
        ),
        expect: []
      }
    ],
    fail: [
      ['text', 'not-a-hash'],
      ['a WordPress phpass hash', '$P$B5ZSu1/XSsf2N8fPuqH7vC8F9jXqAU1'],
      ['a hash that is too short', SAMPLE_HASH.slice(0, 59)],
      ['a cost of 32', SAMPLE_HASH.replace('$10$', '$32$')],
      ['an MD5 digest', '5f4dcc3b5aa765d61d8327deb882cf99']
    ].map(([name, hash]) => ({
      name,
      file: customerFile(customerRow({ password_hash: hash })),
      expect: [invalid('password_hash')]
    }))
  }
});

export const CUS_07 = defineCustomerRule({
  id: 'CUS-07',
  entity: 'customer',
  layer: 'C',
  source: 'engine',
  op: 'C',
  code: 'INVALID_VALUE',
  testedBy: 'example',
  summary: 'password and password_hash are not both given.',
  examples: {
    pass: [
      {
        name: 'only a password',
        file: customerFile(customerRow({ password: 'abc123' })),
        expect: []
      },
      {
        name: 'only a hash',
        file: customerFile(customerRow({ password_hash: SAMPLE_HASH })),
        expect: []
      }
    ],
    fail: [
      {
        name: 'both on a new customer',
        file: customerFile(
          customerRow({ password: 'abc123', password_hash: SAMPLE_HASH })
        ),
        expect: [invalid('password')]
      }
    ]
  }
});

export const CUS_08 = defineRule({
  id: 'CUS-08',
  entity: 'customer',
  layer: 'C',
  source: 'engine',
  op: 'C',
  code: 'INVALID_VALUE',
  testedBy: 'runner',
  test: WRITER_TEST,
  summary:
    'Neither password nor password_hash: a password that nobody knows is set, one bcrypt hash for the whole job; the customer uses "Forgot your password?" (D-27). No issue.'
});

export const CUS_09 = defineCustomerRule({
  id: 'CUS-09',
  entity: 'customer',
  layer: 'M',
  source: 'engine',
  op: 'U',
  code: 'IGNORED_VALUE',
  testedBy: 'example',
  summary:
    'On update the password columns are ignored: core’s updateCustomer drops the password on purpose, and a re-run must not reset a password the customer has changed.',
  examples: {
    pass: [
      {
        name: 'an update without a password',
        store: CUSTOMER_STORE_WITH_JANE,
        file: customerFile(customerRow()),
        expect: []
      },
      {
        name: 'a new customer with a password: it is used',
        file: customerFile(customerRow({ password: 'abc123' })),
        expect: []
      }
    ],
    fail: [
      {
        name: 'an update with a password',
        store: CUSTOMER_STORE_WITH_JANE,
        file: customerFile(customerRow({ password: 'abc123' })),
        expect: [{ code: 'IGNORED_VALUE', rowNumber: 2, column: 'password' }]
      },
      {
        name: 'an update with a hash',
        store: CUSTOMER_STORE_WITH_JANE,
        file: customerFile(customerRow({ password_hash: SAMPLE_HASH })),
        expect: [
          { code: 'IGNORED_VALUE', rowNumber: 2, column: 'password_hash' }
        ]
      },
      {
        name: 'both on an update: both are ignored, and it is not CUS-07',
        store: CUSTOMER_STORE_WITH_JANE,
        file: customerFile(
          customerRow({ password: 'abc123', password_hash: SAMPLE_HASH })
        ),
        expect: [
          { code: 'IGNORED_VALUE', rowNumber: 2, column: 'password' },
          { code: 'IGNORED_VALUE', rowNumber: 2, column: 'password_hash' }
        ]
      },
      {
        name: 'the e-mail in another letter case is the same customer',
        store: CUSTOMER_STORE_WITH_JANE,
        file: customerFile(
          customerRow({ email: 'JANE.DOE@example.com', password: 'abc123' })
        ),
        expect: [{ code: 'IGNORED_VALUE', rowNumber: 2, column: 'password' }]
      }
    ]
  }
});

export const CUS_10 = defineRule({
  id: 'CUS-10',
  entity: 'customer',
  layer: 'I',
  source: 'engine',
  op: 'B',
  code: 'WRITE_FAILED',
  testedBy: 'runner',
  test: WRITER_TEST,
  summary:
    'Custom fields are saved after the customer; if that fails the row is failed with the customer saved, and a re-run completes it.'
});

export const CUS_11 = defineCustomerRule({
  id: 'CUS-11',
  entity: 'customer',
  layer: 'C',
  source: 'engine',
  op: 'C',
  code: 'INVALID_VALUE',
  testedBy: 'example',
  summary:
    'A password cell that holds (hidden) is the placeholder of the file with errors, not a password: the file is refused until the password is typed again or the cell is emptied.',
  examples: {
    pass: [
      {
        name: 'a password that merely contains the word',
        file: customerFile(customerRow({ password: 'my(hidden)pass' })),
        expect: []
      }
    ],
    fail: [
      {
        name: 'the placeholder',
        file: customerFile(customerRow({ password: '(hidden)' })),
        expect: [invalid('password')]
      },
      {
        name: 'the placeholder on an update (the file would be refused anyway)',
        store: CUSTOMER_STORE_WITH_JANE,
        file: customerFile(customerRow({ password: '(hidden)' })),
        expect: [invalid('password')]
      }
    ]
  }
});

export const CUSTOMER_RULES = [
  CUS_01,
  CUS_02,
  CUS_03,
  CUS_04,
  CUS_05,
  CUS_06,
  CUS_07,
  CUS_08,
  CUS_09,
  CUS_10,
  CUS_11
];
