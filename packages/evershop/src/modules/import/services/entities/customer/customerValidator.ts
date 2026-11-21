import {
  cellMessage,
  parseBcryptHash,
  parseBoolean,
  parseEmail
} from '../../cells/parsers.js';
import type { CellFailure } from '../../cells/parsers.js';
import { prepareText } from '../../cells/text.js';
import type {
  Lookup,
  NamedRecord,
  PasswordCheck,
  StoredCustomer,
  StoredMetafield
} from '../../ports/lookup.js';
import type { CsvRow } from '../../reader/readCsv.js';
import {
  ALL_07,
  ALL_08,
  ALL_09,
  ALL_13,
  ALL_14,
  ALL_16,
  ALL_18,
  ALL_21
} from '../../rules/allRules.js';
import {
  CUS_01,
  CUS_02,
  CUS_03,
  CUS_04,
  CUS_05,
  CUS_06,
  CUS_07,
  CUS_09,
  CUS_11
} from '../../rules/customerRules.js';
import { say } from '../../say.js';
import type { ImportIssue } from '../../types.js';
import type {
  BatchResult,
  ConvertedRow,
  EntityValidator,
  HeaderInfo,
  ValidationContext
} from '../definition.js';
import { missingRequired, readMetafields } from '../metafields.js';

/** What a customer row says, typed. A blank cell is left out: "not provided". */
export interface CustomerData {
  /** As written (trimmed): its letter case is kept, the key is lower case. */
  email?: string;
  full_name?: string;
  status?: 0 | 1;
  /** The name of the customer group, as written. */
  group?: string;
  /** Not trimmed: a space is a character of a password. */
  password?: string;
  /** As written; judged at create only (CUS-06, CUS-09). */
  password_hash?: string;
  /** `namespace.key` → the cell. */
  metafields?: Record<string, string>;
}

export type CustomerRow = ConvertedRow<CustomerData>;

/** The reserved keys of the template's example rows (§ 5, ALL-18). */
export const CUSTOMER_EXAMPLE_KEYS: readonly string[] = [
  'example.customer@example.com',
  'example.customer2@example.com'
];

/** What the errors download writes for a password, so as not to echo a secret (§ 5.4.1). */
export const HIDDEN_PASSWORD = '(hidden)';

/** The columns of a customers file (not the `metafield:` ones), in the order of the template. */
export const CUSTOMER_COLUMNS: readonly string[] = [
  'email',
  'full_name',
  'status',
  'group',
  'password_hash',
  'password'
];

const KNOWN_COLUMNS: ReadonlySet<string> = new Set(CUSTOMER_COLUMNS);

const METAFIELD_PREFIX = 'metafield:';

/** Everything that is remembered across the rows of a customer file. */
export interface CustomerState {
  /** The e-mail in lower case → the row where it first appears. */
  firstRow: Map<string, number>;
  /** The e-mail in lower case → the customers of the store (none: not stored). */
  stored: Map<string, StoredCustomer[]>;
  /** The group name in lower case → the groups of that name. */
  groups: Map<string, NamedRecord[]>;
  passwordCheck: PasswordCheck | null;
  /** The custom-field definitions of customers, asked once (§ 5.9). */
  metafields: ReadonlyMap<string, StoredMetafield> | null;
}

const lower = (text: string) => text.trim().toLowerCase();

function fail(
  rule: typeof CUS_01,
  rowNumber: number,
  column: string,
  failure: CellFailure,
  value: string
): ImportIssue {
  return rule.issue({
    rowNumber,
    column,
    params: failure.params,
    message: cellMessage(column, failure),
    value
  });
}

function convert(
  row: CsvRow,
  header: HeaderInfo,
  ctx: ValidationContext
): CustomerRow {
  const base: CustomerRow = {
    rowNumber: row.rowNumber,
    key: null,
    example: false,
    broken: false,
    data: {},
    invalid: [],
    issues: []
  };
  if (row.hasError || row.cells.length !== header.columns.length) {
    // The reader has said what is wrong with the row.
    return { ...base, broken: true };
  }
  const { rowNumber } = row;
  const { data, issues, invalid } = base;
  const raw = (column: string): string | undefined => {
    const at = header.position.get(column);
    return at === undefined ? undefined : row.cells[at];
  };
  const text = (column: string): string | null => {
    const cell = raw(column);
    return cell === undefined ? null : prepareText(cell, 'customer', column);
  };
  void ctx;

  const email = text('email');
  if (email !== null && CUSTOMER_EXAMPLE_KEYS.includes(email.toLowerCase())) {
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
        message: say`Row ${rowNumber} has no email. A customer is identified by the e-mail address.`
      })
    );
  } else {
    const parsed = parseEmail(email);
    if (parsed.ok) {
      data.email = email;
      key = email.toLowerCase();
    } else {
      issues.push(fail(CUS_01, rowNumber, 'email', parsed, email));
      invalid.push('email');
    }
  }

  for (const column of ['full_name', 'group'] as const) {
    const value = text(column);
    if (value !== null) {
      data[column] = value;
    }
  }

  const status = text('status');
  if (status !== null) {
    const parsed = parseBoolean(status);
    if (parsed.ok) {
      data.status = parsed.value;
    } else {
      issues.push(fail(CUS_03, rowNumber, 'status', parsed, status));
      invalid.push('status');
    }
  }

  const password = text('password');
  if (password !== null) {
    if (password === HIDDEN_PASSWORD) {
      issues.push(
        CUS_11.issue({
          rowNumber,
          column: 'password',
          params: { reason: 'placeholder' },
          message: say`The password is "(hidden)", which is what the file with errors shows instead of a password. Type the password again, or leave the cell empty.`
        })
      );
      invalid.push('password');
    } else {
      data.password = password;
    }
  }
  const hash = text('password_hash');
  if (hash !== null) {
    data.password_hash = hash;
  }

  for (const column of header.columns) {
    if (column.startsWith(METAFIELD_PREFIX)) {
      const value = text(column);
      if (value !== null) {
        data.metafields = {
          ...data.metafields,
          [column.slice(METAFIELD_PREFIX.length)]: value
        };
      }
    }
  }
  return { ...base, key };
}

async function ensureStored(
  state: CustomerState,
  lookup: Lookup,
  emails: Iterable<string>
): Promise<void> {
  const missing = [...new Set(emails)].filter((e) => !state.stored.has(e));
  if (missing.length === 0) {
    return;
  }
  const found = await lookup.customers(missing);
  for (const email of missing) {
    state.stored.set(email, found.get(email) ?? []);
  }
}

async function ensureGroups(
  state: CustomerState,
  lookup: Lookup,
  names: Iterable<string>
): Promise<void> {
  const missing = [...new Set([...names].map(lower))].filter(
    (name) => !state.groups.has(name)
  );
  if (missing.length === 0) {
    return;
  }
  const found = await lookup.customerGroups(missing);
  for (const name of missing) {
    state.groups.set(name, found.get(name) ?? []);
  }
}

export const customerValidator: EntityValidator<CustomerData, CustomerState> = {
  entity: 'customer',

  async checkHeader(header, ctx) {
    const issues: ImportIssue[] = [];
    if (!header.position.has('email')) {
      issues.push(
        ALL_07.issue({
          column: 'email',
          params: { column: 'email' },
          message: say`The file has no "email" column. A customer is identified by the e-mail address.`
        })
      );
      return { issues, fatal: true };
    }
    let metafields: ReadonlySet<string> | null = null;
    for (const column of new Set(header.columns)) {
      if (column === '' || KNOWN_COLUMNS.has(column)) {
        continue;
      }
      if (column.startsWith(METAFIELD_PREFIX)) {
        metafields ??= await ctx.lookup.metafieldKeys('customer');
        if (!metafields.has(column.slice(METAFIELD_PREFIX.length))) {
          issues.push(
            ALL_08.issue({
              column,
              params: { column },
              message: say`The column "${column}" names a custom field that does not exist for customers. Create the definition first.`
            })
          );
        }
      } else {
        issues.push(
          ALL_09.issue({
            column,
            params: { column },
            message: say`The column "${column}" is not a column of the customers file and is ignored.`
          })
        );
      }
    }
    return { issues, fatal: false };
  },

  createState: () => ({
    firstRow: new Map(),
    stored: new Map(),
    groups: new Map(),
    passwordCheck: null,
    metafields: null
  }),

  convert,

  index(state, row) {
    if (row.key === null) {
      return [];
    }
    const first = state.firstRow.get(row.key);
    if (first !== undefined) {
      return [
        ALL_14.issue({
          rowNumber: row.rowNumber,
          column: 'email',
          params: { firstRow: first },
          message: say`The e-mail "${row.data.email}" is already used in row ${first} (letter case does not matter). Each customer can appear once in a file.`,
          value: row.data.email
        })
      ];
    }
    state.firstRow.set(row.key, row.rowNumber);
    return [];
  },

  async checkBatch(rows, state, ctx): Promise<BatchResult> {
    const issues: ImportIssue[] = [];
    // A key that appears twice is judged at its first row only.
    const own = rows.filter(
      (row) => row.key !== null && state.firstRow.get(row.key) === row.rowNumber
    );
    state.passwordCheck ??= await ctx.lookup.passwordCheck();
    state.metafields ??= await ctx.lookup.metafields('customer');
    await ensureStored(
      state,
      ctx.lookup,
      own.map((row) => row.key as string)
    );
    await ensureGroups(
      state,
      ctx.lookup,
      own.flatMap((row) => (row.data.group ? [row.data.group] : []))
    );
    let createRows = 0;
    let updateRows = 0;
    for (const row of own) {
      const key = row.key as string;
      const { rowNumber, data } = row;
      const email = data.email as string;
      const matches = state.stored.get(key) ?? [];
      if (matches.length > 1) {
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
        continue;
      }
      const stored = matches[0] ?? null;
      const exists = stored !== null;
      if (exists) {
        updateRows += 1;
      } else {
        createRows += 1;
      }

      const wrongMode =
        (ctx.mode === 'create' && exists) || (ctx.mode === 'update' && !exists);
      if (ctx.mode === 'create' && exists) {
        issues.push(
          ALL_16.issue({
            code: 'ALREADY_EXISTS',
            rowNumber,
            column: 'email',
            params: { key: email },
            message: say`The customer "${email}" already exists, and this import only creates new ones.`,
            value: email
          })
        );
      } else if (ctx.mode === 'update' && !exists) {
        issues.push(
          ALL_16.issue({
            code: 'NOT_FOUND',
            rowNumber,
            column: 'email',
            params: { key: email },
            message: say`The customer "${email}" does not exist, and this import only updates existing ones.`,
            value: email
          })
        );
      }

      if (data.group !== undefined) {
        const groups = state.groups.get(lower(data.group)) ?? [];
        if (groups.length === 0) {
          issues.push(
            CUS_04.issue({
              rowNumber,
              column: 'group',
              params: { reference: 'customer group', value: data.group },
              message: say`The customer group "${data.group}" is not a group of the store.`,
              value: data.group
            })
          );
        } else if (groups.length > 1) {
          issues.push(
            ALL_21.issue({
              rowNumber,
              column: 'group',
              params: {
                reference: 'customer group',
                value: data.group,
                matches: groups.length
              },
              message: say`The customer group "${data.group}" matches ${groups.length} groups, so it is not clear which is meant.`,
              value: data.group
            })
          );
        }
      }

      if (!wrongMode) {
        if (!exists) {
          if (data.full_name === undefined) {
            issues.push(
              CUS_02.issue({
                rowNumber,
                column: 'full_name',
                params: { column: 'full_name' },
                message: say`The new customer "${email}" needs a value in column "full_name".`
              })
            );
          }
          issues.push(...passwordIssues(row, state.passwordCheck));
        } else {
          for (const column of ['password', 'password_hash'] as const) {
            if (data[column] !== undefined) {
              issues.push(
                CUS_09.issue({
                  rowNumber,
                  column,
                  params: { column },
                  message: say`The column "${column}" is ignored for "${email}", who is already a customer: an import never changes a password.`
                })
              );
            }
          }
        }

        const read = readMetafields({
          rowNumber,
          cells: data.metafields,
          definitions: state.metafields,
          deps: { now: ctx.now(), sha256Hex: ctx.sha256Hex }
        });
        issues.push(
          ...read.issues,
          ...missingRequired({
            rowNumber,
            key: email,
            creates: !exists,
            cells: data.metafields,
            stored: stored?.metaData ?? null,
            definitions: state.metafields
          })
        );
      }
    }
    return { issues, createRows, updateRows };
  }
};

/** CUS-05, CUS-06 and CUS-07, for a customer that will be created. */
function passwordIssues(
  row: CustomerRow,
  passwordCheck: PasswordCheck
): ImportIssue[] {
  const { rowNumber, data } = row;
  const issues: ImportIssue[] = [];
  if (data.password !== undefined && data.password_hash !== undefined) {
    issues.push(
      CUS_07.issue({
        rowNumber,
        column: 'password',
        params: { reason: 'both' },
        message: say`Give either a password or a password_hash, not both.`
      })
    );
  }
  if (data.password !== undefined) {
    const checked = passwordCheck(data.password);
    if (!checked.ok) {
      issues.push(
        CUS_05.issue({
          rowNumber,
          column: 'password',
          params: { reason: 'password_rule', message: checked.message },
          message: say`The value in column "password" is refused by the password rules of the store: ${checked.message}.`
        })
      );
    }
  }
  if (data.password_hash !== undefined) {
    const parsed = parseBcryptHash(data.password_hash);
    if (!parsed.ok) {
      issues.push(
        CUS_06.issue({
          rowNumber,
          column: 'password_hash',
          params: parsed.params,
          message: cellMessage('password_hash', parsed)
        })
      );
    }
  }
  return issues;
}
