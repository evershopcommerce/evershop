import { csvLine } from '../report/csvWrite.js';

/**
 * Small builders for the files of the customer rule examples: a valid row with
 * one cell changed is how a rule is shown ("one cell broken, one issue").
 */
export const CUSTOMER_COLUMNS = [
  'email',
  'full_name',
  'status',
  'group',
  'password_hash',
  'password'
] as const;

export type CustomerColumn = (typeof CUSTOMER_COLUMNS)[number];

/** A valid bcrypt hash (cost 10) of nothing anyone uses. */
export const SAMPLE_HASH =
  '$2a$10$0Q/84zq6b8yKCPF.ds8js.NWMO/g5bzSlA8hOlhZxqTWeItH7T3XC';

const VALID: Record<CustomerColumn, string> = {
  email: 'jane.doe@example.com',
  full_name: 'Jane Doe',
  status: '1',
  group: 'Wholesale',
  password_hash: '',
  password: ''
};

/** The header of the files of the examples. */
export const CUSTOMER_HEADER = csvLine(CUSTOMER_COLUMNS).trimEnd();

/** One data row. Without arguments, a valid row that creates `jane.doe@example.com`. */
export function customerRow(
  values: Partial<Record<CustomerColumn, string>> = {}
): string {
  return csvLine(
    CUSTOMER_COLUMNS.map((column) => values[column] ?? VALID[column])
  ).trimEnd();
}

/** A file with the header of the examples and these rows (the first is row 2). */
export function customerFile(...rows: string[]): string {
  return `${CUSTOMER_HEADER}\n${rows.join('\n')}\n`;
}

/** The store the examples run against: a group, and no customer, so a row creates. */
export const CUSTOMER_STORE = {
  customerGroups: [{ name: 'Default' }, { name: 'Wholesale' }]
};

/** The same store with `jane.doe@example.com` stored: a row for her updates. */
export const CUSTOMER_STORE_WITH_JANE = {
  ...CUSTOMER_STORE,
  customers: [
    {
      email: 'jane.doe@example.com',
      name: 'Jane Doe',
      group: 'Default'
    }
  ]
};
