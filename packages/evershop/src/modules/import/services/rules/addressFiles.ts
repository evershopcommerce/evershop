import { csvLine } from '../report/csvWrite.js';

/**
 * Small builders for the files of the address rule examples: a valid row with one
 * cell changed is how a rule is shown ("one cell broken, one issue").
 */
export const ADDRESS_FILE_COLUMNS = [
  'email',
  'recipient',
  'given_name',
  'family_name',
  'organization',
  'address_line_1',
  'address_line_2',
  'address_line_3',
  'locality',
  'dependent_locality',
  'administrative_area',
  'postal_code',
  'sorting_code',
  'country',
  'telephone',
  'extra',
  'is_default'
] as const;

export type AddressFileColumn = (typeof ADDRESS_FILE_COLUMNS)[number];

const VALID: Record<AddressFileColumn, string> = {
  email: 'jane.doe@example.com',
  recipient: 'Jane Doe',
  given_name: '',
  family_name: '',
  organization: '',
  address_line_1: '1 Market Street',
  address_line_2: 'Suite 200',
  address_line_3: '',
  locality: 'San Francisco',
  dependent_locality: '',
  administrative_area: 'US-CA',
  postal_code: '94105',
  sorting_code: '',
  country: 'US',
  telephone: '415-555-0100',
  extra: '',
  is_default: '1'
};

/** The header of the files of the examples. */
export const ADDRESS_HEADER = csvLine(ADDRESS_FILE_COLUMNS).trimEnd();

/** One data row. Without arguments, a valid US address of `jane.doe@example.com`. */
export function addressRow(
  values: Partial<Record<AddressFileColumn, string>> = {}
): string {
  return csvLine(
    ADDRESS_FILE_COLUMNS.map((column) => values[column] ?? VALID[column])
  ).trimEnd();
}

/** A file with the header of the examples and these rows (the first is row 2). */
export function addressFile(...rows: string[]): string {
  return `${ADDRESS_HEADER}\n${rows.join('\n')}\n`;
}

/** The store the examples run against: `jane.doe@example.com` is a customer. */
export const ADDRESS_STORE = {
  customers: [{ email: 'jane.doe@example.com', name: 'Jane Doe' }]
};
