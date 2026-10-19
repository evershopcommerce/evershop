import { descriptionToRows } from '../../cells/description.js';
import type { EditorRow } from '../../cells/description.js';
import {
  cellMessage,
  MAX_QTY,
  parseBoolean,
  parseDecimal,
  parseHttpUrl,
  parseList,
  parseRedirectPath,
  parseWholeNumber
} from '../../cells/parsers.js';
import type { CellFailure } from '../../cells/parsers.js';
import { prepareText } from '../../cells/text.js';
import type {
  Lookup,
  NamedRecord,
  StoredAttribute,
  StoredMetafield,
  StoredProduct
} from '../../ports/lookup.js';
import type { CsvRow } from '../../reader/readCsv.js';
import {
  ALL_07,
  ALL_08,
  ALL_09,
  ALL_10,
  ALL_13,
  ALL_14,
  ALL_16,
  ALL_18,
  ALL_20,
  ALL_21
} from '../../rules/allRules.js';
import { IMG_01 } from '../../rules/categoryRules.js';
import {
  IMG_02,
  PRD_01,
  PRD_03,
  PRD_04,
  PRD_05,
  PRD_06,
  PRD_07,
  PRD_08,
  PRD_09,
  PRD_10,
  PRD_11,
  PRD_12,
  PRD_20,
  PRD_21,
  PRD_22,
  PRD_23,
  PRD_25,
  PRD_26,
  PRD_27,
  PRD_28
} from '../../rules/productRules.js';
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
import {
  checkVariantRow,
  closeRun,
  createVariantState,
  indexVariants
} from './variantChecks.js';
import type { VariantState } from './variantChecks.js';

/** What a product row says, typed. A blank cell is left out: "not provided". */
export interface ProductData {
  sku?: string;
  name?: string;
  url_key?: string;
  status?: 0 | 1;
  visibility?: 0 | 1;
  /** A string: the core pattern checks strings (§ 4.1). */
  price?: string;
  qty?: string;
  weight?: string;
  /** The name of the attribute group, of the package, of the tax class. */
  attribute_group?: string;
  package?: string;
  tax_class?: string;
  /** The `url_key` of the category, in lower case (a reference, § 5.1). */
  category?: string;
  no_shipping_required?: 0 | 1;
  manage_stock?: 0 | 1;
  stock_availability?: 0 | 1;
  short_description?: string;
  description?: EditorRow[];
  meta_title?: string;
  meta_description?: string;
  images?: string[];
  variant_group?: string;
  /** The attribute codes, in lower case, in the order of the cell. */
  variant_axes?: string[];
  redirect_from?: string[];
  /** The `attr:` cells: the lower-case code, the column as written, the text. */
  attributes?: Array<{ code: string; column: string; text: string }>;
  /** `namespace.key` → the cell. Not checked against the definitions yet. */
  metafields?: Record<string, string>;
}

export type ProductRow = ConvertedRow<ProductData>;

/** The reserved keys of the template's example rows (§ 5, ALL-18). */
export const PRODUCT_EXAMPLE_KEYS: readonly string[] = [
  'EXAMPLE-SKU-1',
  'EXAMPLE-SKU-2'
];

/** The columns of a products file (not the `attr:` and `metafield:` ones), in the order of the template. */
export const PRODUCT_COLUMNS: readonly string[] = [
  'sku',
  'name',
  'url_key',
  'status',
  'visibility',
  'price',
  'qty',
  'attribute_group',
  'package',
  'no_shipping_required',
  'manage_stock',
  'stock_availability',
  'weight',
  'tax_class',
  'category',
  'short_description',
  'description',
  'meta_title',
  'meta_description',
  'images',
  'variant_group',
  'variant_axes',
  'redirect_from'
];

const KNOWN_COLUMNS: ReadonlySet<string> = new Set(PRODUCT_COLUMNS);

const ATTR_PREFIX = 'attr:';
const METAFIELD_PREFIX = 'metafield:';
const KEY_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_KEY_LENGTH = 255;
/** `urn:evershop:catalog:product:<uuid>`: who owns a redirect (lib/urn). */
const productUrn = (uuid: string) => `urn:evershop:catalog:product:${uuid}`;

const lower = (text: string) => text.trim().toLowerCase();

/** Columns that a row that creates a product must have a value in (PRD-01). */
const REQUIRED_ON_CREATE = [
  'name',
  'status',
  'visibility',
  'price',
  'qty',
  'attribute_group',
  'manage_stock',
  'stock_availability'
] as const;

/** Everything that is remembered across the rows of a product file. */
export interface ProductState {
  /** `sku` → the row where it first appears. */
  firstRow: Map<string, number>;
  /** A written `url_key` → the first row and the SKU that wrote it (PRD-20). */
  urlKeyFirst: Map<string, { row: number; sku: string }>;
  /** A derived `url_key` → the row that derived it, in the order of the file. */
  derivedKeys: Map<string, number>;
  /** An old path → the first row that gives it (PRD-27). */
  redirectFirst: Map<string, number>;
  /** What the store said about a SKU (null: it is not stored). */
  stored: Map<string, StoredProduct | null>;
  reserved: ReadonlySet<string> | null;
  /** The questions about references, asked once for each distinct value. */
  refs: ReferenceCache;
  /** The variant groups of the file (§ 5.3). */
  variants: VariantState;
  /** The custom-field definitions of products, asked once (§ 5.9). */
  metafields: ReadonlyMap<string, StoredMetafield> | null;
}

/**
 * The answers of the store about the things a product refers to, kept for the
 * whole check: a name is asked for once, however many rows use it (§ 8.5).
 */
export class ReferenceCache {
  readonly groups = new Map<string, NamedRecord[] | null>();

  readonly packages = new Map<string, NamedRecord[] | null>();

  readonly taxClasses = new Map<string, NamedRecord[] | null>();

  readonly categories = new Map<string, boolean>();

  readonly attributes = new Map<string, StoredAttribute | null>();

  readonly options = new Map<number, Map<string, number[] | null>>();

  readonly links = new Map<
    number,
    { linked: ReadonlySet<number>; required: StoredAttribute[] }
  >();

  defaultPackage: NamedRecord | null | undefined;

  readonly urlKeyOwners = new Map<string, string | null>();

  /** An old path → who owns the redirect on it (null: no redirect there). */
  readonly redirects = new Map<string, { entityUrn: string | null } | null>();

  readonly rewrites = new Map<string, boolean>();
}

async function fill<V>(
  cache: Map<string, V | null>,
  keys: Iterable<string>,
  fetch: (missing: string[]) => Promise<Map<string, V>>
): Promise<void> {
  const missing = [...new Set(keys)].filter((key) => !cache.has(key));
  if (missing.length === 0) {
    return;
  }
  const found = await fetch(missing);
  for (const key of missing) {
    cache.set(key, found.get(key) ?? null);
  }
}

function fail(
  rule: { issue: typeof PRD_04.issue },
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
): ProductRow {
  const base: ProductRow = {
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
    return cell === undefined ? null : prepareText(cell, 'product', column);
  };

  const sku = text('sku');
  if (sku !== null && PRODUCT_EXAMPLE_KEYS.includes(sku)) {
    issues.push(
      ALL_18.issue({
        rowNumber,
        column: 'sku',
        params: { key: sku },
        message: `Row ${rowNumber} is an example row of the template (${sku}) and is skipped.`,
        value: sku
      })
    );
    return { ...base, key: sku, example: true };
  }
  let key: string | null = null;
  if (sku === null) {
    issues.push(
      ALL_13.issue({
        rowNumber,
        column: 'sku',
        params: { reason: 'no_key' },
        message: `Row ${rowNumber} has no sku. A product is identified by its sku.`
      })
    );
  } else {
    key = sku;
    data.sku = sku;
  }

  for (const column of [
    'name',
    'short_description',
    'meta_title',
    'meta_description',
    'attribute_group',
    'package',
    'tax_class',
    'variant_group'
  ] as const) {
    const value = text(column);
    if (value !== null) {
      data[column] = value;
    }
  }
  const category = text('category');
  if (category !== null) {
    data.category = category.toLowerCase();
  }

  const urlKey = text('url_key');
  if (urlKey !== null) {
    if (urlKey.length > MAX_KEY_LENGTH || !KEY_PATTERN.test(urlKey)) {
      issues.push(
        PRD_03.issue({
          rowNumber,
          column: 'url_key',
          params: {
            reason: urlKey.length > MAX_KEY_LENGTH ? 'too_long' : 'pattern'
          },
          message:
            'The value in column "url_key" must use only lowercase letters, digits and single hyphens, and be 1 to 255 characters (for example classic-tee).',
          value: urlKey
        })
      );
      invalid.push('url_key');
    } else {
      data.url_key = urlKey;
    }
  }

  for (const column of [
    'status',
    'visibility',
    'no_shipping_required',
    'manage_stock',
    'stock_availability'
  ] as const) {
    const value = text(column);
    if (value !== null) {
      const parsed = parseBoolean(value);
      if (parsed.ok) {
        data[column] = parsed.value;
      } else {
        issues.push(fail(ALL_10, rowNumber, column, parsed, value));
        invalid.push(column);
      }
    }
  }

  for (const [column, rule] of [
    ['price', PRD_04],
    ['weight', PRD_05]
  ] as const) {
    const value = text(column);
    if (value !== null) {
      const parsed = parseDecimal(value);
      if (parsed.ok) {
        data[column] = parsed.value;
      } else {
        issues.push(
          fail(
            parsed.params.reason === 'out_of_range' ? ALL_20 : rule,
            rowNumber,
            column,
            parsed,
            value
          )
        );
        invalid.push(column);
      }
    }
  }
  const qty = text('qty');
  if (qty !== null) {
    const parsed = parseWholeNumber(qty, MAX_QTY);
    if (parsed.ok) {
      data.qty = parsed.value;
    } else {
      issues.push(
        fail(
          parsed.params.reason === 'out_of_range' ? ALL_20 : PRD_06,
          rowNumber,
          'qty',
          parsed,
          qty
        )
      );
      invalid.push('qty');
    }
  }

  const images = text('images');
  if (images !== null) {
    const urls: string[] = [];
    let ok = true;
    for (const item of parseList(images)) {
      const parsed = parseHttpUrl(item);
      if (!parsed.ok) {
        issues.push(fail(IMG_01, rowNumber, 'images', parsed, item));
        ok = false;
      } else if (urls.includes(parsed.value)) {
        issues.push(
          IMG_02.issue({
            rowNumber,
            column: 'images',
            params: { url: parsed.value },
            message: `The image address is given twice in this cell and is used once.`,
            value: parsed.value
          })
        );
      } else {
        urls.push(parsed.value);
      }
    }
    if (ok && urls.length > 0) {
      data.images = urls;
    } else if (!ok) {
      invalid.push('images');
    }
  }

  const redirects = text('redirect_from');
  if (redirects !== null) {
    const paths: string[] = [];
    let ok = true;
    for (const item of parseList(redirects)) {
      const parsed = parseRedirectPath(item);
      if (!parsed.ok) {
        issues.push(fail(PRD_23, rowNumber, 'redirect_from', parsed, item));
        ok = false;
      } else if (!paths.includes(parsed.value)) {
        paths.push(parsed.value);
      }
    }
    if (ok && paths.length > 0) {
      data.redirect_from = paths;
    } else if (!ok) {
      invalid.push('redirect_from');
    }
  }

  const axes = text('variant_axes');
  if (axes !== null) {
    data.variant_axes = parseList(axes).map(lower);
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

  for (const column of header.columns) {
    if (column.startsWith(ATTR_PREFIX)) {
      const code = lower(column.slice(ATTR_PREFIX.length));
      const value = text(column);
      if (code !== '' && value !== null) {
        data.attributes = [
          ...(data.attributes ?? []),
          { code, column, text: value }
        ];
      }
    } else if (column.startsWith(METAFIELD_PREFIX)) {
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

function named(
  cache: Map<string, NamedRecord[] | null>,
  name: string | undefined
): NamedRecord[] | null | undefined {
  return name === undefined ? undefined : cache.get(lower(name));
}

export const productValidator: EntityValidator<ProductData, ProductState> = {
  entity: 'product',

  async checkHeader(header, ctx) {
    const issues: ImportIssue[] = [];
    if (!header.position.has('sku')) {
      issues.push(
        ALL_07.issue({
          column: 'sku',
          params: { column: 'sku' },
          message:
            'The file has no "sku" column. A product is identified by its sku.'
        })
      );
      return { issues, fatal: true };
    }
    let metafields: ReadonlySet<string> | null = null;
    const attributeColumns: string[] = [];
    for (const column of new Set(header.columns)) {
      if (column === '' || KNOWN_COLUMNS.has(column)) {
        continue;
      }
      if (
        column.startsWith(ATTR_PREFIX) &&
        column.length > ATTR_PREFIX.length
      ) {
        attributeColumns.push(column);
      } else if (column.startsWith(METAFIELD_PREFIX)) {
        metafields ??= await ctx.lookup.metafieldKeys('product');
        if (!metafields.has(column.slice(METAFIELD_PREFIX.length))) {
          issues.push(
            ALL_08.issue({
              column,
              params: { column },
              message: `The column "${column}" names a custom field that does not exist for products. Create the definition first.`
            })
          );
        }
      } else {
        issues.push(
          ALL_09.issue({
            column,
            params: { column },
            message: `The column "${column}" is not a column of the products file and is ignored.`
          })
        );
      }
    }
    if (attributeColumns.length > 0) {
      const found = await ctx.lookup.attributes(
        attributeColumns.map((column) => column.slice(ATTR_PREFIX.length))
      );
      for (const column of attributeColumns) {
        if (!found.has(lower(column.slice(ATTR_PREFIX.length)))) {
          issues.push(
            ALL_08.issue({
              column,
              params: { column },
              message: `The column "${column}" names an attribute that does not exist. Create the attribute first.`
            })
          );
        }
      }
    }
    return { issues, fatal: false };
  },

  createState: () => ({
    firstRow: new Map(),
    urlKeyFirst: new Map(),
    derivedKeys: new Map(),
    redirectFirst: new Map(),
    stored: new Map(),
    reserved: null,
    refs: new ReferenceCache(),
    variants: createVariantState(),
    metafields: null
  }),

  convert,

  index(state, row) {
    const issues: ImportIssue[] = [];
    if (row.key === null) {
      return issues;
    }
    const first = state.firstRow.get(row.key);
    if (first !== undefined) {
      return [
        ALL_14.issue({
          rowNumber: row.rowNumber,
          column: 'sku',
          params: { firstRow: first },
          message: `The sku "${row.key}" is already used in row ${first}. Each product can appear once in a file.`,
          value: row.key
        })
      ];
    }
    state.firstRow.set(row.key, row.rowNumber);
    const { url_key: urlKey, redirect_from: paths } = row.data;
    if (urlKey !== undefined) {
      const other = state.urlKeyFirst.get(urlKey);
      if (other) {
        issues.push(
          PRD_20.issue({
            rowNumber: row.rowNumber,
            column: 'url_key',
            params: { firstRow: other.row },
            message: `The url_key "${urlKey}" is already used in row ${other.row}. Each url_key can be used once in a file.`,
            value: urlKey
          })
        );
      } else {
        state.urlKeyFirst.set(urlKey, { row: row.rowNumber, sku: row.key });
      }
    }
    for (const path of paths ?? []) {
      const firstPath = state.redirectFirst.get(path);
      if (firstPath !== undefined) {
        issues.push(
          PRD_27.issue({
            code: 'DUPLICATE_KEY_IN_FILE',
            rowNumber: row.rowNumber,
            column: 'redirect_from',
            params: { path, firstRow: firstPath },
            message: `The old address "${path}" is already given in row ${firstPath}. A path can redirect from one product only.`,
            value: path
          })
        );
      } else {
        state.redirectFirst.set(path, row.rowNumber);
      }
    }
    issues.push(...indexVariants(state.variants, row));
    return issues;
  },

  async checkBatch(rows, state, ctx): Promise<BatchResult> {
    const issues: ImportIssue[] = [];
    const { lookup } = ctx;
    const { refs } = state;
    // A SKU that appears twice is judged at its first row only.
    const own = rows.filter(
      (row) => row.key !== null && state.firstRow.get(row.key) === row.rowNumber
    );
    state.reserved ??= await lookup.reservedUrlKeys();
    state.metafields ??= await lookup.metafields('product');
    await fill(
      state.stored,
      own.map((row) => row.key as string),
      (skus) => lookup.products(skus)
    );

    // Everything the rows of this batch refer to, asked together.
    const names = (pick: (data: ProductData) => string | undefined) =>
      own.flatMap((row) => {
        const value = pick(row.data);
        return value === undefined ? [] : [lower(value)];
      });
    await fill(
      refs.groups,
      names((d) => d.attribute_group),
      (keys) => lookup.attributeGroups(keys)
    );
    await fill(
      refs.packages,
      names((d) => d.package),
      (keys) => lookup.packages(keys)
    );
    await fill(
      refs.taxClasses,
      names((d) => d.tax_class),
      (keys) => lookup.taxClasses(keys)
    );
    const categoryKeys = [
      ...new Set(
        own.flatMap((row) => (row.data.category ? [row.data.category] : []))
      )
    ].filter((key) => !refs.categories.has(key));
    if (categoryKeys.length > 0) {
      const found = await lookup.categories(categoryKeys);
      for (const key of categoryKeys) {
        refs.categories.set(key, found.has(key));
      }
    }
    await fill(
      refs.attributes,
      own.flatMap((row) => [
        ...(row.data.attributes ?? []).map((a) => a.code),
        ...(row.data.variant_axes ?? [])
      ]),
      (codes) => lookup.attributes(codes)
    );
    if (refs.defaultPackage === undefined) {
      refs.defaultPackage = await lookup.defaultPackage();
    }

    // The url_keys that are written, and those that will be derived.
    const derived = new Map<number, string>();
    for (const row of own) {
      const stored = state.stored.get(row.key as string);
      if (!stored && row.data.url_key === undefined && row.data.name) {
        const slug = slugify(row.data.name);
        if (slug !== '') {
          derived.set(row.rowNumber, slug);
        }
      }
    }
    const urlKeysToAsk = [
      ...own.flatMap((row) =>
        row.data.url_key !== undefined ? [row.data.url_key] : []
      ),
      ...derived.values()
    ];
    await fill(refs.urlKeyOwners, urlKeysToAsk, async (keys) =>
      lookup.productUrlKeyOwners(keys)
    );
    const paths = own.flatMap((row) => row.data.redirect_from ?? []);
    const newPaths = [...new Set(paths)].filter(
      (path) => !refs.redirects.has(path)
    );
    if (newPaths.length > 0) {
      const found = await lookup.redirects(newPaths);
      const rewrites = await lookup.rewritePaths(newPaths);
      for (const path of newPaths) {
        const redirect = found.get(path);
        refs.redirects.set(
          path,
          redirect ? { entityUrn: redirect.entityUrn } : null
        );
        refs.rewrites.set(path, rewrites.has(path));
      }
    }

    let createRows = 0;
    let updateRows = 0;
    for (const row of own) {
      const key = row.key as string;
      const { rowNumber, data } = row;
      const stored = state.stored.get(key) ?? null;
      const exists = stored !== null;
      if (exists) {
        updateRows += 1;
      } else {
        createRows += 1;
      }

      const wrongMode = modeIssue(ctx.mode, exists, rowNumber, key);
      if (wrongMode) {
        issues.push(wrongMode);
      } else if (!exists) {
        for (const column of REQUIRED_ON_CREATE) {
          if (data[column] === undefined && !row.invalid.includes(column)) {
            issues.push(
              PRD_01.issue({
                rowNumber,
                column,
                params: { column },
                message: `The new product "${key}" needs a value in column "${column}".`
              })
            );
          }
        }
      }

      // The url_key: written, or derived on a row that creates (PRD-28).
      let urlKey = data.url_key;
      if (!exists && urlKey === undefined && !row.invalid.includes('url_key')) {
        if (data.name !== undefined) {
          urlKey = derived.get(rowNumber);
          if (urlKey === undefined) {
            issues.push(
              PRD_28.issue({
                rowNumber,
                column: 'url_key',
                params: { reason: 'cannot_derive' },
                message: `The url_key is blank and cannot be made from the name, because it has no Latin letters or digits. Write a url_key.`,
                value: data.name
              })
            );
          } else {
            const written = state.urlKeyFirst.get(urlKey);
            const earlier = state.derivedKeys.get(urlKey);
            if (written || earlier !== undefined) {
              const other = written ? written.row : (earlier as number);
              issues.push(
                PRD_20.issue({
                  rowNumber,
                  column: 'url_key',
                  params: { firstRow: other, derived: true },
                  message: `The url_key "${urlKey}" made from the name is already used in row ${other}. Write a different url_key.`,
                  value: urlKey
                })
              );
            } else {
              state.derivedKeys.set(urlKey, rowNumber);
            }
          }
        }
      }
      if (urlKey !== undefined) {
        const owner = refs.urlKeyOwners.get(urlKey);
        if (owner && owner !== key) {
          issues.push(
            PRD_21.issue({
              rowNumber,
              column: 'url_key',
              params: { urlKey, owner },
              message: `The url_key "${urlKey}" is already used by the product with the sku "${owner}".`,
              value: urlKey
            })
          );
        }
        if (state.reserved.has(urlKey)) {
          issues.push(
            PRD_22.issue({
              rowNumber,
              column: 'url_key',
              params: { urlKey },
              message: `The url_key "${urlKey}" is the address of a page of the store or a language code, so a product cannot use it.`,
              value: urlKey
            })
          );
        }
      }

      // References (PRD-09, PRD-10, ALL-21).
      const group = reference(
        issues,
        refs.groups,
        data.attribute_group,
        rowNumber,
        'attribute_group',
        'attribute group'
      );
      reference(
        issues,
        refs.taxClasses,
        data.tax_class,
        rowNumber,
        'tax_class',
        'tax class'
      );
      const pack = reference(
        issues,
        refs.packages,
        data.package,
        rowNumber,
        'package',
        'package'
      );
      if (data.category !== undefined && !refs.categories.get(data.category)) {
        issues.push(
          PRD_10.issue({
            rowNumber,
            column: 'category',
            params: { reference: 'category', value: data.category },
            message: `The category "${data.category}" is not a category of the store.`,
            value: data.category
          })
        );
      }

      // PRD-07, PRD-08: the package of a shippable product (the merged record).
      const virtual =
        data.no_shipping_required ?? (stored?.noShippingRequired ? 1 : 0);
      if (data.no_shipping_required === 1) {
        for (const column of ['package', 'weight'] as const) {
          if (data[column] !== undefined) {
            issues.push(
              PRD_08.issue({
                rowNumber,
                column,
                params: { column },
                message: `The product "${key}" needs no shipping, so its ${column} is not stored.`,
                value: data[column]
              })
            );
          }
        }
      }
      if (
        virtual === 0 &&
        data.package === undefined &&
        !row.invalid.includes('package') &&
        !(stored?.packageId != null)
      ) {
        if (!refs.defaultPackage) {
          issues.push(
            PRD_07.issue({
              rowNumber,
              column: 'package',
              params: { reason: 'no_default_package' },
              message: `The product "${key}" is shipped and has no package, and the store has no default package. Write a package.`
            })
          );
        }
      }

      // The attribute group of the merged record, for the attribute rules.
      const groupId: number | null = group
        ? group.id
        : data.attribute_group === undefined
        ? stored?.attributeGroupId ?? null
        : null;
      if (groupId !== null) {
        await checkAttributes({
          issues,
          state,
          lookup,
          row,
          groupId,
          stored
        });
      }

      // The custom fields (MET-01 to MET-05).
      if (!wrongMode) {
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
            key,
            creates: !exists,
            cells: data.metafields,
            stored: stored?.metaData ?? null,
            definitions: state.metafields
          })
        );
      }

      // The variant group the row belongs to (PRD-14 to PRD-19, PRD-24).
      const packageId =
        virtual === 1
          ? null
          : pack
          ? pack.id
          : data.package === undefined
          ? stored?.packageId ?? refs.defaultPackage?.id ?? null
          : null;
      issues.push(
        ...(await checkVariantRow(state.variants, {
          row,
          stored,
          lookup,
          groupId,
          packageId,
          attribute: (code) => refs.attributes.get(code),
          linked: (id) =>
            refs.links.get(groupId as number)?.linked.has(id) ?? true,
          optionId: (code) => {
            const cell = data.attributes?.find((c) => c.code === code);
            const attribute = refs.attributes.get(code);
            if (!cell || !attribute) return null;
            const ids = refs.options.get(attribute.id)?.get(lower(cell.text));
            return ids && ids.length === 1 ? ids[0] : null;
          }
        }))
      );

      // PRD-27: the old paths.
      const ownUrn = stored ? productUrn(stored.uuid) : null;
      for (const path of data.redirect_from ?? []) {
        const redirect = refs.redirects.get(path);
        if (
          redirect &&
          (redirect.entityUrn === null || redirect.entityUrn !== ownUrn)
        ) {
          issues.push(
            PRD_27.issue({
              code: 'CONFLICT',
              rowNumber,
              column: 'redirect_from',
              params: { path },
              message: `The old address "${path}" is already a redirect of another record.`,
              value: path
            })
          );
        } else if (refs.rewrites.get(path)) {
          issues.push(
            PRD_27.issue({
              code: 'IGNORED_VALUE',
              rowNumber,
              column: 'redirect_from',
              params: { path },
              message: `The old address "${path}" is the address of a page of the store, so the redirect would never be used.`,
              value: path
            })
          );
        }
      }
    }
    return { issues, createRows, updateRows };
  },

  async finish(state): Promise<BatchResult> {
    return {
      issues: closeRun(state.variants),
      createRows: 0,
      updateRows: 0
    };
  }
};

function modeIssue(
  mode: ValidationContext['mode'],
  exists: boolean,
  rowNumber: number,
  key: string
): ImportIssue | null {
  if (mode === 'create' && exists) {
    return ALL_16.issue({
      code: 'ALREADY_EXISTS',
      rowNumber,
      column: 'sku',
      params: { key },
      message: `The product "${key}" already exists, and this import only creates new ones.`,
      value: key
    });
  }
  if (mode === 'update' && !exists) {
    return ALL_16.issue({
      code: 'NOT_FOUND',
      rowNumber,
      column: 'sku',
      params: { key },
      message: `The product "${key}" does not exist, and this import only updates existing ones.`,
      value: key
    });
  }
  return null;
}

// Resolves a name to one record, or says why it cannot (PRD-09, ALL-21).
function reference(
  issues: ImportIssue[],
  cache: Map<string, NamedRecord[] | null>,
  value: string | undefined,
  rowNumber: number,
  column: string,
  label: string
): NamedRecord | null {
  const records = named(cache, value);
  if (value === undefined) {
    return null;
  }
  if (!records || records.length === 0) {
    issues.push(
      PRD_09.issue({
        rowNumber,
        column,
        params: { reference: column, value },
        message: `The ${label} "${value}" does not exist in the store.`,
        value
      })
    );
    return null;
  }
  if (records.length > 1) {
    issues.push(
      ALL_21.issue({
        rowNumber,
        column,
        params: { reference: column, value, matches: records.length },
        message: `The ${label} "${value}" matches ${records.length} records. Rename them so that the name is unique.`,
        value
      })
    );
    return null;
  }
  return records[0];
}

interface AttributeCheck {
  issues: ImportIssue[];
  state: ProductState;
  lookup: Lookup;
  row: ProductRow;
  groupId: number;
  stored: StoredProduct | null;
}

// The attribute rules on the merged record (PRD-11, PRD-12, PRD-25, PRD-26).
async function checkAttributes(args: AttributeCheck): Promise<void> {
  const { issues, state, lookup, row, groupId, stored } = args;
  const { refs } = state;
  const { rowNumber, data } = row;
  const key = row.key as string;
  if (!refs.links.has(groupId)) {
    refs.links.set(groupId, await lookup.attributeGroupLinks(groupId));
  }
  const links = refs.links.get(groupId) as {
    linked: ReadonlySet<number>;
    required: StoredAttribute[];
  };

  const given = new Set<string>();
  for (const cell of data.attributes ?? []) {
    const attribute = refs.attributes.get(cell.code);
    if (!attribute) {
      // The header said so (ALL-08).
      continue;
    }
    given.add(cell.code);
    if (!links.linked.has(attribute.id)) {
      issues.push(
        PRD_11.issue({
          rowNumber,
          column: cell.column,
          params: { attribute: attribute.code },
          message: `The attribute "${attribute.code}" is not linked to the attribute group of the product "${key}", so its value would be removed.`,
          value: cell.text
        })
      );
      continue;
    }
    await checkOptions(issues, state, lookup, rowNumber, cell, attribute);
  }

  // PRD-25: a required attribute needs a value.
  const have = new Set([
    ...given,
    ...(stored?.attributeCodes ?? []).map(lower)
  ]);
  for (const attribute of links.required) {
    if (!have.has(lower(attribute.code))) {
      issues.push(
        PRD_25.issue({
          rowNumber,
          column: `${ATTR_PREFIX}${attribute.code}`,
          params: { attribute: attribute.code },
          message: `The attribute "${attribute.code}" is required for the attribute group of the product "${key}" and has no value.`
        })
      );
    }
  }

  // PRD-26: a new group removes the values of attributes it does not contain.
  if (
    stored &&
    data.attribute_group !== undefined &&
    stored.attributeGroupId !== groupId &&
    stored.attributeCodes.length > 0
  ) {
    const old = await lookup.attributes(stored.attributeCodes);
    const lost = [...old.values()].filter((a) => !links.linked.has(a.id));
    if (lost.length > 0) {
      issues.push(
        PRD_26.issue({
          rowNumber,
          column: 'attribute_group',
          params: { attributes: lost.map((a) => a.code) },
          message: `The product "${key}" changes its attribute group; the values of ${lost
            .map((a) => `"${a.code}"`)
            .join(
              ', '
            )} are removed because the new group does not contain them.`,
          value: data.attribute_group
        })
      );
    }
  }
}

async function checkOptions(
  issues: ImportIssue[],
  state: ProductState,
  lookup: Lookup,
  rowNumber: number,
  cell: { code: string; column: string; text: string },
  attribute: StoredAttribute
): Promise<void> {
  const { refs } = state;
  if (attribute.type === 'text' || attribute.type === 'textarea') {
    return;
  }
  if (attribute.type !== 'select' && attribute.type !== 'multiselect') {
    issues.push(
      PRD_12.issue({
        code: 'INVALID_VALUE',
        rowNumber,
        column: cell.column,
        params: { reason: 'unsupported_attribute_type', type: attribute.type },
        message: `The attribute "${attribute.code}" has the type "${attribute.type}", which the import cannot write.`,
        value: cell.text
      })
    );
    return;
  }
  const texts =
    attribute.type === 'multiselect' ? parseList(cell.text) : [cell.text];
  let options = refs.options.get(attribute.id);
  if (!options) {
    options = new Map();
    refs.options.set(attribute.id, options);
  }
  const wanted = texts.map(lower).filter((text) => !options.has(text));
  if (wanted.length > 0) {
    const found = await lookup.attributeOptions(attribute.id, wanted);
    for (const text of new Set(wanted)) {
      options.set(text, found.get(text) ?? null);
    }
  }
  for (const text of texts) {
    const ids = options.get(lower(text));
    if (!ids || ids.length === 0) {
      issues.push(
        PRD_12.issue({
          rowNumber,
          column: cell.column,
          params: { attribute: attribute.code, option: text },
          message: `"${text}" is not an option of the attribute "${attribute.code}".`,
          value: text
        })
      );
    } else if (ids.length > 1) {
      issues.push(
        ALL_21.issue({
          rowNumber,
          column: cell.column,
          params: {
            reference: 'attribute option',
            value: text,
            matches: ids.length
          },
          message: `"${text}" matches ${ids.length} options of the attribute "${attribute.code}". Rename them so that each text is unique.`,
          value: text
        })
      );
    }
  }
}
