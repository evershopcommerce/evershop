import { descriptionToRows } from '../../cells/description.js';
import type { EditorRow } from '../../cells/description.js';
import {
  cellMessage,
  MAX_POSITION,
  parseBoolean,
  parseHttpUrl,
  parseWholeNumber
} from '../../cells/parsers.js';
import type { CellFailure } from '../../cells/parsers.js';
import { prepareText } from '../../cells/text.js';
import type {
  Lookup,
  StoredCategory,
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
  ALL_20
} from '../../rules/allRules.js';
import {
  CAT_01,
  CAT_02,
  CAT_03,
  CAT_04,
  CAT_05,
  CAT_06,
  CAT_08,
  CAT_09,
  IMG_01
} from '../../rules/categoryRules.js';
import { slugify } from '../../slug.js';
import type { ImportIssue } from '../../types.js';
import type {
  BatchResult,
  ConvertedRow,
  EntityValidator,
  HeaderInfo,
  ValidationContext
} from '../definition.js';
import { missingRequired, readMetafields } from '../metafields.js';

/** What a category row says, typed. A blank cell is left out: "not provided". */
export interface CategoryData {
  name?: string;
  url_key?: string;
  /** The `url_key` of the parent, in lower case (a reference, § 5.1). */
  parent?: string;
  status?: 0 | 1;
  /** A string: the core pattern checks strings (§ 4.1). */
  position?: string;
  description?: EditorRow[];
  meta_title?: string;
  meta_description?: string;
  image?: string;
  /** `namespace.key` → the cell. Not checked against the definitions yet. */
  metafields?: Record<string, string>;
}

export type CategoryRow = ConvertedRow<CategoryData>;

/** The reserved keys of the template's example rows (§ 5, ALL-18). */
export const CATEGORY_EXAMPLE_KEYS: readonly string[] = [
  'example-category',
  'example-subcategory'
];

/** The columns of a categories file, in the order of the template. */
export const CATEGORY_COLUMNS: readonly string[] = [
  'url_key',
  'name',
  'parent',
  'status',
  'position',
  'description',
  'meta_title',
  'meta_description',
  'image'
];

const KNOWN_COLUMNS: ReadonlySet<string> = new Set(CATEGORY_COLUMNS);

const METAFIELD_PREFIX = 'metafield:';
const KEY_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_KEY_LENGTH = 255;
// The deepest chain of parents that is followed; a real tree is far shallower.
const MAX_CHAIN = 200;

/** Everything that is remembered across the rows of a category file. */
export interface CategoryState {
  /** `url_key` → the row where it first appears. */
  firstRow: Map<string, number>;
  /** `url_key` → the parent the file gives it (rows with a parent only). */
  parentOf: Map<string, string>;
  /** What the store said about a `url_key` (null: it is not stored). */
  stored: Map<string, StoredCategory | null>;
  reserved: ReadonlySet<string> | null;
  /** The custom-field definitions of categories, asked once (§ 5.9). */
  metafields: ReadonlyMap<string, StoredMetafield> | null;
}

async function ensureStored(
  state: CategoryState,
  lookup: Lookup,
  keys: Iterable<string>
): Promise<void> {
  const missing = [...new Set(keys)].filter((key) => !state.stored.has(key));
  if (missing.length === 0) {
    return;
  }
  const found = await lookup.categories(missing);
  for (const key of missing) {
    state.stored.set(key, found.get(key) ?? null);
  }
}

function fail(
  rule: typeof CAT_02,
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
): CategoryRow {
  const base: CategoryRow = {
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
    return cell === undefined ? null : prepareText(cell, 'category', column);
  };

  // ALL-18: a row of the template's examples is reported and read no further.
  const written = text('url_key');
  if (written !== null && CATEGORY_EXAMPLE_KEYS.includes(written)) {
    issues.push(
      ALL_18.issue({
        rowNumber,
        column: 'url_key',
        params: { key: written },
        message: `Row ${rowNumber} is an example row of the template (${written}) and is skipped.`,
        value: written
      })
    );
    return { ...base, key: written, example: true };
  }

  const name = text('name');
  if (name !== null) {
    data.name = name;
  }

  // The key: as written, or derived from the name (CAT-09, D-24).
  let key = written;
  if (key === null) {
    const typed = (raw('name') ?? '').trim();
    if (typed === '') {
      issues.push(
        ALL_13.issue({
          rowNumber,
          column: 'url_key',
          params: { reason: 'no_key_and_no_name' },
          message: `Row ${rowNumber} has no url_key and no name to make one from.`
        })
      );
    } else {
      const slug = slugify(typed);
      if (slug === '') {
        issues.push(
          CAT_09.issue({
            rowNumber,
            column: 'url_key',
            params: { reason: 'cannot_derive' },
            message: `The url_key is blank and cannot be made from the name, because it has no Latin letters or digits. Write a url_key.`,
            value: typed
          })
        );
      } else {
        key = slug;
      }
    }
  }
  if (key !== null) {
    if (key.length > MAX_KEY_LENGTH || !KEY_PATTERN.test(key)) {
      issues.push(
        CAT_02.issue({
          rowNumber,
          column: 'url_key',
          params: {
            reason: key.length > MAX_KEY_LENGTH ? 'too_long' : 'pattern'
          },
          message:
            'The value in column "url_key" must use only lowercase letters, digits and single hyphens, and be 1 to 255 characters (for example women-shoes).',
          value: key
        })
      );
      key = null;
    } else {
      data.url_key = key;
    }
  }

  const status = text('status');
  if (status !== null) {
    const parsed = parseBoolean(status);
    if (parsed.ok) {
      data.status = parsed.value;
    } else {
      // ALL-10 converts the word; CAT-03 says the column takes 0 or 1.
      issues.push(fail(CAT_03, rowNumber, 'status', parsed, status));
      invalid.push('status');
    }
  }

  const position = text('position');
  if (position !== null) {
    const parsed = parseWholeNumber(position, MAX_POSITION);
    if (parsed.ok) {
      data.position = parsed.value;
    } else {
      issues.push(
        fail(
          parsed.params.reason === 'out_of_range' ? ALL_20 : CAT_04,
          rowNumber,
          'position',
          parsed,
          position
        )
      );
      invalid.push('position');
    }
  }

  const image = text('image');
  if (image !== null) {
    const parsed = parseHttpUrl(image);
    if (parsed.ok) {
      data.image = parsed.value;
    } else {
      issues.push(fail(IMG_01, rowNumber, 'image', parsed, image));
      invalid.push('image');
    }
  }

  const parent = text('parent');
  if (parent !== null) {
    data.parent = parent.toLowerCase();
  }
  const description = text('description');
  if (description !== null) {
    const rows = descriptionToRows(description, {
      now: ctx.now(),
      sha256Hex: ctx.sha256Hex
    });
    if (rows !== null) {
      data.description = rows;
    }
  }
  for (const column of ['meta_title', 'meta_description'] as const) {
    const value = text(column);
    if (value !== null) {
      data[column] = value;
    }
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

export const categoryValidator: EntityValidator<CategoryData, CategoryState> = {
  entity: 'category',

  async checkHeader(header, ctx) {
    const issues: ImportIssue[] = [];
    if (!header.position.has('url_key')) {
      issues.push(
        ALL_07.issue({
          column: 'url_key',
          params: { column: 'url_key' },
          message:
            'The file has no "url_key" column. A category is identified by its url_key.'
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
        metafields ??= await ctx.lookup.metafieldKeys('category');
        if (!metafields.has(column.slice(METAFIELD_PREFIX.length))) {
          issues.push(
            ALL_08.issue({
              column,
              params: { column },
              message: `The column "${column}" names a custom field that does not exist for categories. Create the definition first.`
            })
          );
        }
      } else {
        issues.push(
          ALL_09.issue({
            column,
            params: { column },
            message: `The column "${column}" is not a column of the categories file and is ignored.`
          })
        );
      }
    }
    return { issues, fatal: false };
  },

  createState: () => ({
    firstRow: new Map(),
    parentOf: new Map(),
    stored: new Map(),
    reserved: null,
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
          column: 'url_key',
          params: { firstRow: first },
          message: `The url_key "${row.key}" is already used in row ${first}. Each category can appear once in a file.`,
          value: row.key
        })
      ];
    }
    state.firstRow.set(row.key, row.rowNumber);
    if (row.data.parent) {
      state.parentOf.set(row.key, row.data.parent);
    }
    return [];
  },

  async checkBatch(rows, state, ctx): Promise<BatchResult> {
    const issues: ImportIssue[] = [];
    // A key that appears twice is judged at its first row only.
    const own = rows.filter(
      (row) => row.key !== null && state.firstRow.get(row.key) === row.rowNumber
    );
    state.reserved ??= await ctx.lookup.reservedUrlKeys();
    state.metafields ??= await ctx.lookup.metafields('category');
    await ensureStored(state, ctx.lookup, [
      ...own.map((row) => row.key as string),
      ...own.flatMap((row) => (row.data.parent ? [row.data.parent] : []))
    ]);
    let createRows = 0;
    let updateRows = 0;
    for (const row of own) {
      const key = row.key as string;
      const { rowNumber } = row;
      const exists = state.stored.get(key) != null;
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
            column: 'url_key',
            params: { key },
            message: `The category "${key}" already exists, and this import only creates new ones.`,
            value: key
          })
        );
      } else if (ctx.mode === 'update' && !exists) {
        issues.push(
          ALL_16.issue({
            code: 'NOT_FOUND',
            rowNumber,
            column: 'url_key',
            params: { key },
            message: `The category "${key}" does not exist, and this import only updates existing ones.`,
            value: key
          })
        );
      } else if (!exists) {
        for (const column of ['name', 'status'] as const) {
          if (row.data[column] === undefined && !row.invalid.includes(column)) {
            issues.push(
              CAT_01.issue({
                rowNumber,
                column,
                params: { column },
                message: `The new category "${key}" needs a value in column "${column}".`
              })
            );
          }
        }
      }

      if (!wrongMode) {
        const read = readMetafields({
          rowNumber,
          cells: row.data.metafields,
          definitions: state.metafields,
          deps: { now: ctx.now(), sha256Hex: ctx.sha256Hex }
        });
        issues.push(
          ...read.issues,
          ...missingRequired({
            rowNumber,
            key,
            creates: !exists,
            cells: row.data.metafields,
            stored: state.stored.get(key)?.metaData ?? null,
            definitions: state.metafields
          })
        );
      }

      if (state.reserved.has(key)) {
        issues.push(
          CAT_08.issue({
            rowNumber,
            column: 'url_key',
            params: { key },
            message: `The url_key "${key}" is the address of a page of the store or a language code, so a category cannot use it.`,
            value: key
          })
        );
      }

      const { parent } = row.data;
      if (parent) {
        // A category that is its own parent is a loop of one step, which
        // `findCycle` finds like any other.
        if (!state.firstRow.has(parent) && state.stored.get(parent) == null) {
          issues.push(
            CAT_05.issue({
              rowNumber,
              column: 'parent',
              params: { reference: 'category', value: parent },
              message: `The parent "${parent}" is not a category of the store or of this file.`,
              value: parent
            })
          );
        } else {
          const loop = await findCycle(key, parent, state, ctx.lookup);
          if (loop) {
            issues.push(cycle(rowNumber, loop));
          }
        }
      }
    }
    return { issues, createRows, updateRows };
  }
};

function cycle(rowNumber: number, chain: string[]): ImportIssue {
  return CAT_06.issue({
    rowNumber,
    column: 'parent',
    params: { chain },
    message: `The parent would make a loop: ${chain.join(
      ' → '
    )}. A category cannot be its own ancestor.`
  });
}

// Follows the parents from `parent`, as the tree will be after the import: the
// parent the file gives, else the stored one. Returns the loop when it leads
// back to `key`; a loop that does not contain `key` belongs to other rows.
async function findCycle(
  key: string,
  parent: string,
  state: CategoryState,
  lookup: Lookup
): Promise<string[] | null> {
  const chain = [key];
  const seen = new Set([key]);
  let current: string | null = parent;
  while (current !== null && chain.length < MAX_CHAIN) {
    if (current === key) {
      return [...chain, key];
    }
    if (seen.has(current)) {
      return null;
    }
    seen.add(current);
    chain.push(current);
    await ensureStored(state, lookup, [current]);
    current =
      state.parentOf.get(current) ??
      state.stored.get(current)?.parentUrlKey ??
      null;
  }
  return null;
}
