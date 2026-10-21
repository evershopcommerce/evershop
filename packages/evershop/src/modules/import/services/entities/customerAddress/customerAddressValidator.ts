import { cellMessage, parseBoolean, parseJson } from '../../cells/parsers.js';
import type { CellFailure } from '../../cells/parsers.js';
import { prepareText } from '../../cells/text.js';
import type { AddressRules, StoredCustomer } from '../../ports/lookup.js';
import type { CsvRow } from '../../reader/readCsv.js';
import {
  ALL_07,
  ALL_09,
  ALL_13,
  ALL_18,
  ALL_21
} from '../../rules/allRules.js';
import {
  ADR_01,
  ADR_02,
  ADR_10,
  ADR_11,
  ADR_12
} from '../../rules/customerAddressRules.js';
import { say } from '../../say.js';
import type { ImportIssue } from '../../types.js';
import type {
  BatchResult,
  ConvertedRow,
  EntityValidator,
  HeaderInfo
} from '../definition.js';
import { addressIssues } from './addressIssues.js';

/** What an address row says. A blank cell is left out: "not provided". */
export interface AddressData {
  /** The customer's e-mail, as written. */
  email?: string;
  /** The shared columns the row gives, trimmed and escaped as REST does. */
  address: Record<string, string>;
  extra?: Record<string, unknown>;
  isDefault?: 0 | 1;
}

export type AddressRow = ConvertedRow<AddressData>;

/** The reserved e-mail of the template's example rows (§ 5, ALL-18). */
export const ADDRESS_EXAMPLE_KEYS: readonly string[] = [
  'example.customer@example.com'
];

/** The columns of the file that are columns of an address. */
export const ADDRESS_VALUE_COLUMNS: readonly string[] = [
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
  'telephone'
];

const KNOWN_COLUMNS: ReadonlySet<string> = new Set([
  'email',
  ...ADDRESS_VALUE_COLUMNS,
  'extra',
  'is_default'
]);

/** Everything that is remembered across the rows of an address file. */
export interface AddressState {
  /** The customer (e-mail in lower case) → the row of the first default address. */
  defaultRow: Map<string, number>;
  /** The e-mail in lower case → the customers of the store (none: not stored). */
  stored: Map<string, StoredCustomer[]>;
  rules: AddressRules | null;
}

function fail(
  rule: typeof ADR_10,
  rowNumber: number,
  column: string,
  failure: CellFailure,
  value: string
): ImportIssue {
  return rule.issue({
    code: failure.code,
    rowNumber,
    column,
    params: failure.params,
    message: cellMessage(column, failure),
    value
  });
}

function convert(row: CsvRow, header: HeaderInfo): AddressRow {
  const base: AddressRow = {
    rowNumber: row.rowNumber,
    key: null,
    example: false,
    broken: false,
    data: { address: {} },
    invalid: [],
    issues: []
  };
  if (row.hasError || row.cells.length !== header.columns.length) {
    // The reader has said what is wrong with the row.
    return { ...base, broken: true };
  }
  const { rowNumber } = row;
  const { data, issues, invalid } = base;
  const text = (column: string): string | null => {
    const at = header.position.get(column);
    return at === undefined
      ? null
      : prepareText(row.cells[at], 'customerAddress', column);
  };

  const email = text('email');
  if (email !== null && ADDRESS_EXAMPLE_KEYS.includes(email.toLowerCase())) {
    issues.push(
      ALL_18.issue({
        rowNumber,
        column: 'email',
        params: { key: email },
        message: say`Row ${rowNumber} is an example row of the template (${email}) and is skipped.`,
        value: email
      })
    );
    return { ...base, key: email.toLowerCase(), example: true };
  }
  let key: string | null = null;
  if (email === null) {
    issues.push(
      ALL_13.issue({
        rowNumber,
        column: 'email',
        params: { reason: 'no_key' },
        message: say`Row ${rowNumber} has no email. An address belongs to the customer with that e-mail address.`
      })
    );
  } else {
    data.email = email;
    key = email.toLowerCase();
  }

  for (const column of ADDRESS_VALUE_COLUMNS) {
    const value = text(column);
    if (value !== null) {
      data.address[column] = value;
    }
  }

  const extra = text('extra');
  if (extra !== null) {
    const parsed = parseJson(extra, 'object');
    if (parsed.ok) {
      data.extra = parsed.value as Record<string, unknown>;
    } else {
      issues.push(fail(ADR_10, rowNumber, 'extra', parsed, extra));
      invalid.push('extra');
    }
  }
  const isDefault = text('is_default');
  if (isDefault !== null) {
    const parsed = parseBoolean(isDefault);
    if (parsed.ok) {
      data.isDefault = parsed.value;
    } else {
      issues.push(fail(ADR_11, rowNumber, 'is_default', parsed, isDefault));
      invalid.push('is_default');
    }
  }
  return { ...base, key };
}

/** The address a row gives, in the form the services take. */
export function addressOf(data: AddressData): Record<string, unknown> {
  return {
    ...data.address,
    ...(data.extra ? { extra: data.extra } : {})
  };
}

export const customerAddressValidator: EntityValidator<
  AddressData,
  AddressState
> = {
  entity: 'customerAddress',

  async checkHeader(header) {
    const issues: ImportIssue[] = [];
    if (!header.position.has('email')) {
      issues.push(
        ALL_07.issue({
          column: 'email',
          params: { column: 'email' },
          message: say`The file has no "email" column. An address belongs to the customer with that e-mail address.`
        })
      );
      return { issues, fatal: true };
    }
    for (const column of new Set(header.columns)) {
      if (column === '' || KNOWN_COLUMNS.has(column)) {
        continue;
      }
      issues.push(
        ALL_09.issue({
          column,
          params: { column },
          message: say`The column "${column}" is not a column of the customer addresses file and is ignored.`
        })
      );
    }
    return { issues, fatal: false };
  },

  createState: () => ({
    defaultRow: new Map(),
    stored: new Map(),
    rules: null
  }),

  convert,

  // An address is only added, so a repeated customer is the normal case (D-18);
  // the one thing to say across rows is more than one default (ADR-12).
  index(state, row) {
    if (row.key === null || row.data.isDefault !== 1) {
      return [];
    }
    const first = state.defaultRow.get(row.key);
    if (first === undefined) {
      state.defaultRow.set(row.key, row.rowNumber);
      return [];
    }
    return [
      ADR_12.issue({
        rowNumber: row.rowNumber,
        column: 'is_default',
        params: { firstRow: first },
        message: say`Row ${first} already makes an address of "${row.data.email}" the default one. The last one in the file wins.`,
        value: '1'
      })
    ];
  },

  async checkBatch(rows, state, ctx): Promise<BatchResult> {
    const issues: ImportIssue[] = [];
    const own = rows.filter((row) => row.key !== null);
    state.rules ??= await ctx.lookup.addressRules();
    const { rules } = state;
    const missing = [...new Set(own.map((row) => row.key as string))].filter(
      (email) => !state.stored.has(email)
    );
    if (missing.length > 0) {
      const found = await ctx.lookup.customers(missing);
      for (const email of missing) {
        state.stored.set(email, found.get(email) ?? []);
      }
    }
    for (const row of own) {
      const { rowNumber, data } = row;
      const email = data.email as string;
      const matches = state.stored.get(row.key as string) ?? [];
      if (matches.length === 0) {
        issues.push(
          ADR_01.issue({
            rowNumber,
            column: 'email',
            params: { reference: 'customer', value: email },
            message: say`There is no customer with the e-mail "${email}". Import the customers first.`,
            value: email
          })
        );
      } else if (matches.length > 1) {
        issues.push(
          ALL_21.issue({
            rowNumber,
            column: 'email',
            params: {
              reference: 'email',
              value: email,
              matches: matches.length
            },
            message: say`The e-mail "${email}" matches ${matches.length} customers of the store that differ only in letter case, so it is not clear which is meant.`,
            value: email
          })
        );
      }

      const { country } = data.address;
      const known = country === undefined || rules.isKnownCountry(country);
      if (!known) {
        issues.push(
          ADR_02.issue({
            rowNumber,
            column: 'country',
            params: { reason: 'unknown_country' },
            message: say`The country "${country}" is not a country code the store knows (two letters, such as US).`,
            value: country
          })
        );
      } else {
        const normalized = await rules.normalize(addressOf(data));

        issues.push(...addressIssues(await rules.check(normalized), rowNumber));
        if (data.extra && country !== undefined) {
          const allowed = new Set(rules.extraIds(country));
          for (const name of Object.keys(data.extra)) {
            if (!allowed.has(name)) {
              issues.push(
                ADR_10.issue({
                  code: 'INVALID_VALUE',
                  rowNumber,
                  column: 'extra',
                  params: { reason: 'unknown_extra', key: name },
                  message: say`The extra field "${name}" is not registered for the country ${country.toUpperCase()}.`
                })
              );
            }
          }
        }
      }
    }
    return { issues, createRows: own.length, updateRows: 0 };
  }
};
