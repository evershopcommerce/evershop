import type { Readable } from 'stream';
import type { HeaderInfo, ValidationContext } from '../entities/definition.js';
import {
  mergeMetaData,
  missingRequired,
  readMetafields
} from '../entities/metafields.js';
import {
  productValidator,
  type ProductRow,
  type ProductState
} from '../entities/product/productValidator.js';
import { ImagePrefetcher } from '../images/prefetch.js';
import { imageIssue, ImageError } from '../images/types.js';
import type { ImageFetcher } from '../images/types.js';
import type { ProductPlan } from '../plan/productPlan.js';
import type { Clock } from '../ports/clock.js';
import type { StoredProduct } from '../ports/lookup.js';
import type { EntityServices, ProductWrite } from '../ports/services.js';
import { readCsv } from '../reader/readCsv.js';
import type { CsvLimits } from '../reader/readCsv.js';
import {
  isTransientDatabaseError,
  isTransientImageError,
  withRetries
} from '../retry.js';
import { ALL_16 } from '../rules/allRules.js';
import { IMP_01, IMP_02, IMP_04, IMP_05 } from '../rules/importPhaseRules.js';
import { PRD_07, PRD_18, PRD_28 } from '../rules/productRules.js';
import { slugify } from '../slug.js';
import type { ImportIssue } from '../types.js';
import type { WriteOutcome, WriteResult } from './categoryWriter.js';
import { ProductResolver } from './productResolver.js';
import type { ResolvedProduct } from './productResolver.js';

export interface ProductWriterArgs {
  open: () => Readable;
  limits?: Partial<CsvLimits>;
  header: HeaderInfo;
  state: ProductState;
  plan: ProductPlan;
  context: ValidationContext;
  services: EntityServices;
  images: ImageFetcher;
  /** Images fetched ahead of their rows, at the same time (default 1: one at a time). */
  imageConcurrency?: number;
  clock: Pick<Clock, 'sleep'>;
  /** The job is a resumed one (IMP-07): a product that exists is updated. */
  resumed?: boolean;
  include?: (unit: { unit: number; rowNumber: number; key: string }) => boolean;
  signal?: AbortSignal;
  /** Rows whose state is asked of the store together (units are never cut). */
  batchSize?: number;
}

const DEFAULT_BATCH_SIZE = 1000;

/** The group of the unit that is being written. */
interface UnitGroup {
  id: number;
  uuid: string;
  /** The first member is in it: later members no longer depend on it. */
  settled: boolean;
}

function failure(error: unknown, row: ProductRow): ImportIssue {
  const { rowNumber, key } = row;
  const e = error as {
    message?: unknown;
    code?: unknown;
    constraint?: unknown;
  };
  const message = String(e?.message ?? error);
  // Core turns the two unique constraints into plain sentences without a code.
  if (message.startsWith('This SKU is already used')) {
    return IMP_02.issue({
      rowNumber,
      column: 'sku',
      params: { constraint: 'PRODUCT_SKU_UNIQUE' },
      message: `The sku "${key}" is already used by another product.`,
      value: key as string
    });
  }
  if (message.startsWith('This URL key is already used')) {
    return IMP_02.issue({
      rowNumber,
      column: 'url_key',
      params: { constraint: 'PRODUCT_URL_KEY_UNIQUE' },
      message: `The url_key of the product "${key}" is already used by another product.`
    });
  }
  if (e?.code === '23505') {
    return IMP_02.issue({
      rowNumber,
      params: {
        constraint: typeof e.constraint === 'string' ? e.constraint : undefined,
        sqlState: '23505'
      },
      message: `A value of the product "${key}" is already used by another record.`
    });
  }
  return IMP_01.issue({
    rowNumber,
    params: typeof e?.code === 'string' ? { sqlState: e.code } : {},
    message: `The product "${key}" could not be saved: ${message}`
  });
}

/**
 * Writes the products of a file that has been checked, in the order of the file.
 * A unit is one row, or the rows of one variant group (§ 4.3), which are next to
 * each other. It yields what happened to each row; the runner counts, saves its
 * place at the end of a unit, and stops at the tenth failed row by not asking for
 * the next one.
 *
 * In a unit that makes a new group, the first member creates the group and joins
 * it: if that fails, the rest of the unit is skipped (IMP-04). After that the
 * members are independent: a member that fails fails alone, and the ones that
 * joined stay joined. Images are fetched before a row is written (IMP-03); the
 * redirects are a second step after the product is saved, so a row can end half
 * done (IMP-05) and a re-run completes it.
 */
export async function* writeProducts(
  args: ProductWriterArgs
): AsyncGenerator<WriteOutcome, void, undefined> {
  const { state, context, signal } = args;
  const batchSize = args.batchSize ?? DEFAULT_BATCH_SIZE;
  const resolver = new ProductResolver(context.lookup);
  const groups = new Map<number, { uuid: string }>();
  let unitNumber = 0;
  // The images of the rows of a batch are fetched a few at a time while the rows
  // before them are written (§ 8.5).
  const prefetcher = new ImagePrefetcher(
    args.images,
    Math.max(1, Math.floor(args.imageConcurrency ?? 1)),
    signal
  );

  async function* readUnits(): AsyncGenerator<ProductRow[], void, undefined> {
    let open: ProductRow[] = [];
    let label: string | null = null;
    for await (const event of readCsv(args.open(), args.limits)) {
      if (event.type !== 'row') continue;
      const row = productValidator.convert(event.row, args.header, context);
      // The rows that were indexed, and only those (see categoryRowsAtLevel).
      if (row.key === null || state.firstRow.get(row.key) !== row.rowNumber) {
        continue;
      }
      const next = row.data.variant_group ?? null;
      if (open.length > 0 && next !== null && next === label) {
        open.push(row);
      } else {
        if (open.length > 0) yield open;
        open = [row];
        label = next;
      }
    }
    if (open.length > 0) yield open;
  }

  async function* writeBatch(
    units: ProductRow[][]
  ): AsyncGenerator<WriteOutcome, void, undefined> {
    const rows = units.flat();
    await resolver.prepare(rows);
    const stored = await context.lookup.products(
      rows.map((row) => row.key as string)
    );
    const wanted = (number: number, row: ProductRow) =>
      !args.include ||
      args.include({
        unit: number,
        rowNumber: row.rowNumber,
        key: row.key as string
      });
    prefetcher.schedule(
      units.flatMap((unit, at) =>
        unit
          .filter((row) => wanted(unitNumber + at + 1, row))
          .flatMap((row) => row.data.images ?? [])
      )
    );
    try {
      for (const unit of units) {
        unitNumber += 1;
        const included = unit.filter((row) => wanted(unitNumber, row));
        if (included.length === 0) continue;
        if (signal?.aborted) return;
        yield* writeUnit(unitNumber, unit, included, stored);
      }
    } finally {
      // What was fetched ahead for rows that were not written is forgotten.
      prefetcher.clear();
    }
  }

  async function* writeUnit(
    unit: number,
    all: ProductRow[],
    included: ProductRow[],
    stored: Map<string, StoredProduct>
  ): AsyncGenerator<WriteOutcome, void, undefined> {
    const label = all[0].data.variant_group ?? null;
    let group: UnitGroup | null = null;
    let conflict = false;
    if (label !== null) {
      const ids = new Set(
        all
          .map((row) => stored.get(row.key as string)?.variantGroupId ?? null)
          .filter((id): id is number => id !== null)
      );
      if (ids.size > 1) {
        conflict = true;
      } else if (ids.size === 1) {
        const [id] = ids;
        let known = groups.get(id);
        if (!known) {
          const found = (await context.lookup.variantGroups([id])).get(id);
          if (found) {
            known = { uuid: found.uuid };
            groups.set(id, known);
          }
        }
        group = known ? { id, uuid: known.uuid, settled: true } : null;
      }
    }
    // A new group: its first member makes it, and the others depend on that.
    let dependsOnFirst = label !== null && group === null && !conflict;
    let dependencyFailed: string | null = null;

    for (let at = 0; at < included.length; at += 1) {
      if (signal?.aborted) return;
      const row = included[at];
      const key = row.key as string;
      let retries = 0;
      const onRetry = () => {
        retries += 1;
      };
      const outcome = (
        result: WriteResult,
        ...issues: ImportIssue[]
      ): WriteOutcome => ({
        unit,
        rowNumber: row.rowNumber,
        key,
        result,
        issues,
        retries,
        unitDone: at === included.length - 1
      });

      if (dependencyFailed !== null) {
        yield outcome(
          'skipped',
          IMP_04.issue({
            rowNumber: row.rowNumber,
            column: 'variant_group',
            params: { group: label, firstRow: dependencyFailed },
            message: `Row ${row.rowNumber} was skipped because the first member of the variant group "${label}" could not be saved.`,
            value: label as string
          })
        );
        continue;
      }
      if (conflict) {
        yield outcome(
          'failed',
          PRD_18.issue({
            rowNumber: row.rowNumber,
            column: 'variant_group',
            params: { group: label },
            message: `The members of the variant group "${label}" are in different variant groups in the store now. The import never moves a product between groups.`,
            value: label as string
          })
        );
        continue;
      }

      const result = await writeRow({
        row,
        stored: stored.get(key) ?? null,
        label,
        group,
        onRetry
      });
      if (result.group) {
        group = result.group;
      }
      if (dependsOnFirst) {
        // The first member settles the group, or the rest of the unit goes.
        if (result.joined) {
          dependsOnFirst = false;
        } else if (result.result === 'failed') {
          dependsOnFirst = false;
          dependencyFailed = String(row.rowNumber);
        }
      }
      yield outcome(result.result, ...result.issues);
    }
  }

  interface RowContext {
    row: ProductRow;
    stored: StoredProduct | null;
    label: string | null;
    group: UnitGroup | null;
    onRetry: () => void;
  }

  interface RowResult {
    result: WriteResult;
    issues: ImportIssue[];
    group?: UnitGroup;
    /** The product is in the variant group (or has none to be in). */
    joined?: boolean;
  }

  async function writeRow(ctx: RowContext): Promise<RowResult> {
    const { row, stored, label, onRetry } = ctx;
    const key = row.key as string;
    const { rowNumber, data } = row;
    const dbRetry = {
      isTransient: isTransientDatabaseError,
      sleep: args.clock.sleep,
      onRetry,
      signal
    };
    const failed = (...issues: ImportIssue[]): RowResult => ({
      result: 'failed',
      issues
    });

    if (context.mode === 'create' && stored && !args.resumed) {
      return failed(
        ALL_16.issue({
          code: 'ALREADY_EXISTS',
          rowNumber,
          column: 'sku',
          params: { key },
          message: `The product "${key}" already exists, and this import only creates new ones.`,
          value: key
        })
      );
    }
    if (context.mode === 'update' && !stored) {
      return failed(
        ALL_16.issue({
          code: 'NOT_FOUND',
          rowNumber,
          column: 'sku',
          params: { key },
          message: `The product "${key}" does not exist, and this import only updates existing ones.`,
          value: key
        })
      );
    }
    // The custom fields: read and checked again, as the definitions may have
    // changed since the check. Core replaces the whole set on a save, so what is
    // sent is the stored set with the cells laid over it (§ 5.9).
    const read = readMetafields({
      rowNumber,
      cells: data.metafields,
      definitions: resolver.metafields,
      deps: { now: context.now(), sha256Hex: context.sha256Hex }
    });
    const lacking = missingRequired({
      rowNumber,
      key,
      creates: !stored,
      cells: data.metafields,
      stored: stored?.metaData ?? null,
      definitions: resolver.metafields
    });
    if (read.issues.length + lacking.length > 0) {
      return failed(...read.issues, ...lacking);
    }
    const hasCells = Object.keys(read.values).length > 0;
    const metafields =
      hasCells || (!stored && resolver.metafields.size > 0)
        ? mergeMetaData(stored?.metaData, read.values)
        : undefined;
    const resolved = resolver.resolve(row, stored);
    if (resolved.problems.length > 0) {
      return failed(...resolved.problems);
    }
    // The images are fetched before anything is written (IMP-03).
    let imagePaths: string[] | undefined;
    if (data.images !== undefined) {
      imagePaths = [];
      for (const source of data.images) {
        try {
          const image = await withRetries(() => prefetcher.fetch(source), {
            isTransient: isTransientImageError,
            sleep: args.clock.sleep,
            onRetry,
            signal
          });
          imagePaths.push(image.url);
        } catch (error) {
          const problem =
            error instanceof ImageError
              ? error
              : new ImageError('network', { code: 'ERROR' });
          return failed(
            imageIssue(problem, { rowNumber, column: 'images', value: source })
          );
        }
      }
    }

    const built = stored
      ? updateInput(row, resolved, stored, imagePaths, resolver)
      : createInput(row, resolved, imagePaths, resolver);
    if ('issue' in built) {
      return failed(built.issue);
    }
    if (metafields !== undefined) {
      built.input.metafields = metafields;
    }

    let uuid: string;
    try {
      if (stored) {
        uuid = stored.uuid;
        if (Object.keys(built.input).length > 0) {
          await withRetries(
            () => args.services.updateProduct(stored.uuid, built.input),
            dbRetry
          );
        }
      } else {
        const created = await withRetries(
          () => args.services.createProduct(built.input),
          dbRetry
        );
        uuid = created.uuid;
      }
    } catch (error) {
      return failed(failure(error, row));
    }
    const result: WriteResult = stored ? 'updated' : 'created';

    // The variant group: made by the first member, joined by every member.
    let { group } = ctx;
    let madeGroup: UnitGroup | undefined;
    if (label !== null) {
      try {
        if (!group) {
          const attributeGroupId = resolved.groupId ?? stored?.attributeGroupId;
          const axes = (data.variant_axes ?? []).map((code) =>
            resolver.storedAttributeCode(code)
          );
          const made = await withRetries(
            () =>
              args.services.createVariantGroup({
                attributeGroupId: attributeGroupId as number,
                axisCodes: axes
              }),
            dbRetry
          );
          group = { id: made.id, uuid: made.uuid, settled: false };
          madeGroup = group;
        }
        if (stored?.variantGroupId !== group.id) {
          const target = group;
          await withRetries(
            () => args.services.addVariantItem(target.uuid, uuid),
            dbRetry
          );
        }
      } catch (error) {
        return {
          result: 'failed',
          issues: [
            partial(error, row, 'saved, but not put in its variant group')
          ],
          group: madeGroup
        };
      }
    }

    if (data.redirect_from && data.redirect_from.length > 0) {
      const paths = data.redirect_from;
      try {
        await withRetries(
          () => args.services.recordRedirects(uuid, paths),
          dbRetry
        );
      } catch (error) {
        return {
          result: 'failed',
          issues: [partial(error, row, 'saved, but its redirects were not')],
          group: madeGroup,
          joined: label !== null
        };
      }
    }
    return { result, issues: [], group: madeGroup, joined: label !== null };
  }

  const batch: ProductRow[][] = [];
  let rowsInBatch = 0;
  for await (const unit of readUnits()) {
    batch.push(unit);
    rowsInBatch += unit.length;
    if (rowsInBatch >= batchSize) {
      yield* writeBatch(batch.splice(0));
      rowsInBatch = 0;
      if (signal?.aborted) return;
    }
  }
  yield* writeBatch(batch.splice(0));
}

// A row that ended half done (IMP-05): the product is saved, a later step is not.
function partial(error: unknown, row: ProductRow, what: string): ImportIssue {
  const message = String((error as { message?: unknown })?.message ?? error);
  return IMP_05.issue({
    rowNumber: row.rowNumber,
    params: { step: what },
    message: `The product "${row.key}" ${what}: ${message}. Run the import again to complete it.`
  });
}

type Built = { input: ProductWrite } | { issue: ImportIssue };

function createInput(
  row: ProductRow,
  r: ResolvedProduct,
  images: string[] | undefined,
  resolver: ProductResolver
): Built {
  const { data, rowNumber } = row;
  const urlKey = data.url_key ?? slugify(data.name ?? '');
  if (urlKey === '') {
    return {
      issue: PRD_28.issue({
        rowNumber,
        column: 'url_key',
        params: { reason: 'cannot_derive' },
        message: `The url_key cannot be made from the name of the product "${row.key}".`
      })
    };
  }
  const input: ProductWrite = {
    sku: data.sku,
    name: data.name,
    url_key: urlKey,
    status: data.status,
    visibility: data.visibility,
    price: data.price,
    qty: data.qty,
    manage_stock: data.manage_stock,
    stock_availability: data.stock_availability,
    group_id: r.groupId === null ? undefined : String(r.groupId)
  };
  if (data.no_shipping_required !== undefined) {
    input.no_shipping_required = data.no_shipping_required;
  }
  if (data.no_shipping_required !== 1) {
    const packageId = r.packageId ?? resolver.defaultPackage?.id ?? null;
    if (packageId === null) {
      return {
        issue: PRD_07.issue({
          rowNumber,
          column: 'package',
          params: { reason: 'no_default_package' },
          message: `The product "${row.key}" is shipped, has no package, and the store has no default package.`
        })
      };
    }
    input.package_id = String(packageId);
    if (data.weight !== undefined) input.weight = data.weight;
  }
  common(input, row, r, images);
  return { input };
}

function updateInput(
  row: ProductRow,
  r: ResolvedProduct,
  stored: StoredProduct,
  images: string[] | undefined,
  resolver: ProductResolver
): Built {
  const { data, rowNumber } = row;
  const input: ProductWrite = {};
  if (data.name !== undefined) input.name = data.name;
  // The sku is the identity; the key is sent only when it changes.
  if (data.url_key !== undefined && data.url_key !== stored.urlKey) {
    input.url_key = data.url_key;
  }
  if (data.status !== undefined) input.status = data.status;
  if (data.visibility !== undefined) input.visibility = data.visibility;
  if (data.price !== undefined) input.price = data.price;
  if (data.qty !== undefined) input.qty = data.qty;
  if (data.manage_stock !== undefined) input.manage_stock = data.manage_stock;
  if (data.stock_availability !== undefined) {
    input.stock_availability = data.stock_availability;
  }
  if (r.groupId !== null && r.groupId !== stored.attributeGroupId) {
    input.group_id = String(r.groupId);
  }
  if (data.no_shipping_required !== undefined) {
    input.no_shipping_required = data.no_shipping_required;
  }
  const virtual =
    data.no_shipping_required !== undefined
      ? data.no_shipping_required === 1
      : stored.noShippingRequired;
  if (!virtual) {
    if (r.packageId !== null) {
      input.package_id = String(r.packageId);
    } else if (stored.packageId === null) {
      // A shipped product needs a package (core refuses the save otherwise):
      // the default one when nothing is given (D-25).
      const fallback = resolver.defaultPackage?.id ?? null;
      if (fallback === null) {
        return {
          issue: PRD_07.issue({
            rowNumber,
            column: 'package',
            params: { reason: 'no_default_package' },
            message: `The product "${row.key}" is shipped, has no package, and the store has no default package.`
          })
        };
      }
      input.package_id = String(fallback);
    }
    if (data.weight !== undefined) input.weight = data.weight;
  }
  common(input, row, r, images);
  if (
    r.categoryId === null ||
    (data.category !== undefined &&
      data.category === stored.categoryUrlKey?.toLowerCase())
  ) {
    delete input.category_id;
  }
  return { input };
}

// The fields that a create and an update send the same way.
function common(
  input: ProductWrite,
  row: ProductRow,
  r: ResolvedProduct,
  images: string[] | undefined
): void {
  const { data } = row;
  if (r.taxClassId !== null) input.tax_class = String(r.taxClassId);
  if (r.categoryId !== null) input.category_id = String(r.categoryId);
  if (data.short_description !== undefined) {
    input.short_description = data.short_description;
  }
  if (data.description !== undefined) input.description = data.description;
  if (data.meta_title !== undefined) input.meta_title = data.meta_title;
  if (data.meta_description !== undefined) {
    input.meta_description = data.meta_description;
  }
  if (images !== undefined) input.images = images;
  if (r.attributes.length > 0) input.attributes = r.attributes;
}
