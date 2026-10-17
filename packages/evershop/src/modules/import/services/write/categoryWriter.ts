import type { Readable } from 'stream';
import type {
  CategoryData,
  CategoryRow,
  CategoryState
} from '../entities/category/categoryValidator.js';
import type { HeaderInfo, ValidationContext } from '../entities/definition.js';
import { imageIssue, ImageError } from '../images/types.js';
import type { ImageFetcher } from '../images/types.js';
import { categoryRowsAtLevel } from '../plan/categoryPlan.js';
import type { CategoryPlan } from '../plan/categoryPlan.js';
import type { Clock } from '../ports/clock.js';
import type { StoredCategory } from '../ports/lookup.js';
import type { CategoryWrite, EntityServices } from '../ports/services.js';
import type { CsvLimits } from '../reader/readCsv.js';
import {
  isTransientDatabaseError,
  isTransientImageError,
  withRetries
} from '../retry.js';
import { ALL_16 } from '../rules/allRules.js';
import { CAT_05 } from '../rules/categoryRules.js';
import { CAT_07, IMP_01, IMP_02 } from '../rules/importPhaseRules.js';
import type { ImportIssue, ImportMode } from '../types.js';

/** What happened to one row (a unit, for categories). */
export type WriteResult = 'created' | 'updated' | 'failed' | 'skipped';

export interface WriteOutcome {
  /** The place in the plan order, from 1. */
  unit: number;
  rowNumber: number;
  key: string;
  result: WriteResult;
  /** Why a row failed or was skipped; empty otherwise. */
  issues: ImportIssue[];
  /** How many times a transient failure was waited out. */
  retries: number;
}

export interface CategoryWriterArgs {
  open: () => Readable;
  limits?: Partial<CsvLimits>;
  header: HeaderInfo;
  state: CategoryState;
  plan: CategoryPlan;
  /** The reading context: the store to ask, the mode, the time, the hash. */
  context: ValidationContext;
  services: EntityServices;
  images: ImageFetcher;
  clock: Pick<Clock, 'sleep'>;
  /**
   * The job is a resumed one (IMP-07): a record that exists is updated even in
   * mode `create`, because the worker that died may have written it.
   */
  resumed?: boolean;
  /**
   * Which units to write. A unit that is not included is passed over, but still
   * counts in `unit`, so that the numbers are those of the whole plan. The
   * runner uses it to resume.
   */
  include?: (unit: { unit: number; rowNumber: number; key: string }) => boolean;
  signal?: AbortSignal;
  /** Rows whose current state is asked of the store together. */
  batchSize?: number;
}

const DEFAULT_BATCH_SIZE = 1000;

// The constraint of the unique `url_key` and the column it is about.
const CONSTRAINT_COLUMNS: Record<string, string> = {
  CATEGORY_URL_KEY_UNIQUE: 'url_key'
};

function serviceInput(
  data: CategoryData,
  options: { parentId?: string; image?: string; withKey: boolean }
): CategoryWrite {
  const input: CategoryWrite = {};
  if (options.withKey && data.url_key !== undefined)
    input.url_key = data.url_key;
  if (data.name !== undefined) input.name = data.name;
  if (data.status !== undefined) input.status = data.status;
  if (data.position !== undefined) input.position = data.position;
  if (data.description !== undefined) input.description = data.description;
  if (data.meta_title !== undefined) input.meta_title = data.meta_title;
  if (data.meta_description !== undefined) {
    input.meta_description = data.meta_description;
  }
  if (options.image !== undefined) input.image = options.image;
  if (options.parentId !== undefined) input.parent_id = options.parentId;
  return input;
}

function failure(error: unknown, row: CategoryRow): ImportIssue {
  const { rowNumber, key } = row;
  const e = error as {
    message?: unknown;
    code?: unknown;
    constraint?: unknown;
  };
  const message = String(e?.message ?? error);
  if (e?.code === '23505') {
    const constraint =
      typeof e.constraint === 'string' ? e.constraint : undefined;
    const column = constraint ? CONSTRAINT_COLUMNS[constraint] : undefined;
    return IMP_02.issue({
      rowNumber,
      column,
      params: { constraint, sqlState: '23505' },
      message: column
        ? `The ${column} "${key}" is already used by another category.`
        : `A value of the category "${key}" is already used by another record.`,
      value: column === 'url_key' ? (key as string) : undefined
    });
  }
  return IMP_01.issue({
    rowNumber,
    params: typeof e?.code === 'string' ? { sqlState: e.code } : {},
    message: `The category "${key}" could not be saved: ${message}`
  });
}

/**
 * Writes the categories of a file that has been checked, in plan order (§ 4.3):
 * level by level, parents first, and inside a level in the order of the file. It
 * yields what happened to each row; the runner counts, saves its place, and stops
 * at the tenth failed row by not asking for the next one.
 *
 * A row that fails does not stop the others (§ 8.6). The rows below a failed row
 * are skipped, and so are theirs (CAT-07). What the store has for a row is asked
 * for again just before it is written, so a category that someone created since
 * the check is updated, and one that someone deleted is created or refused
 * according to the mode.
 */
export async function* writeCategories(
  args: CategoryWriterArgs
): AsyncGenerator<WriteOutcome, void, undefined> {
  const { plan, context, services, images, clock, signal } = args;
  const batchSize = args.batchSize ?? DEFAULT_BATCH_SIZE;
  // The keys of the rows that failed or were skipped.
  const failed = new Set<string>();
  let unit = 0;

  for (let level = 0; level < plan.levels; level += 1) {
    const rows = categoryRowsAtLevel({
      open: args.open,
      limits: args.limits,
      header: args.header,
      state: args.state,
      plan,
      level,
      context
    });
    let batch: CategoryRow[] = [];
    const takeBatch = async function* (): AsyncGenerator<WriteOutcome> {
      const keys = batch.flatMap((row) => [
        row.key as string,
        ...(row.data.parent ? [row.data.parent] : [])
      ]);
      const stored = await context.lookup.categories(keys);
      for (const row of batch) {
        unit += 1;
        const key = row.key as string;
        if (
          args.include &&
          !args.include({ unit, rowNumber: row.rowNumber, key })
        ) {
          continue;
        }
        if (signal?.aborted) {
          return;
        }
        yield await writeOne(row, unit, stored);
      }
      batch = [];
    };
    for await (const row of rows) {
      batch.push(row);
      if (batch.length >= batchSize) {
        yield* takeBatch();
        if (signal?.aborted) return;
      }
    }
    yield* takeBatch();
    if (signal?.aborted) return;
  }

  async function writeOne(
    row: CategoryRow,
    unitNumber: number,
    stored: Map<string, StoredCategory>
  ): Promise<WriteOutcome> {
    const key = row.key as string;
    const { rowNumber, data } = row;
    let retries = 0;
    const countRetry = () => {
      retries += 1;
    };
    const outcome = (
      result: WriteResult,
      ...issues: ImportIssue[]
    ): WriteOutcome => {
      if (result === 'failed' || result === 'skipped') {
        failed.add(key);
      }
      return { unit: unitNumber, rowNumber, key, result, issues, retries };
    };

    const parentKey = data.parent;
    if (parentKey !== undefined && failed.has(parentKey)) {
      return outcome(
        'skipped',
        CAT_07.issue({
          rowNumber,
          column: 'parent',
          params: { parent: parentKey },
          message: `Row ${rowNumber} was skipped because its parent "${parentKey}" could not be saved.`,
          value: parentKey
        })
      );
    }
    let parentId: string | undefined;
    if (parentKey !== undefined) {
      // A parent of the file is written before its children, in an earlier level,
      // and the store is asked again for each batch, so it is found there.
      const parent = stored.get(parentKey);
      if (!parent) {
        return outcome(
          'failed',
          CAT_05.issue({
            rowNumber,
            column: 'parent',
            params: { reference: 'category', value: parentKey },
            message: `The parent "${parentKey}" is no longer a category of the store.`,
            value: parentKey
          })
        );
      }
      parentId = String(parent.id);
    }

    const existing = stored.get(key) ?? null;
    if (args.context.mode === 'create' && existing && !args.resumed) {
      return outcome(
        'failed',
        ALL_16.issue({
          code: 'ALREADY_EXISTS',
          rowNumber,
          column: 'url_key',
          params: { key },
          message: `The category "${key}" already exists, and this import only creates new ones.`,
          value: key
        })
      );
    }
    if (args.context.mode === 'update' && !existing) {
      return outcome(
        'failed',
        ALL_16.issue({
          code: 'NOT_FOUND',
          rowNumber,
          column: 'url_key',
          params: { key },
          message: `The category "${key}" does not exist, and this import only updates existing ones.`,
          value: key
        })
      );
    }
    if (data.metafields) {
      return outcome(
        'failed',
        IMP_01.issue({
          rowNumber,
          column: 'metafield',
          params: { reason: 'custom_fields_not_supported' },
          message: `The custom fields of the category "${key}" cannot be written yet.`
        })
      );
    }

    // The image is fetched before anything is written (IMP-03).
    let image: string | undefined;
    if (data.image !== undefined) {
      const source = data.image;
      try {
        image = (
          await withRetries(() => images.fetchAndStore(source), {
            isTransient: isTransientImageError,
            sleep: clock.sleep,
            onRetry: countRetry,
            signal
          })
        ).url;
      } catch (error) {
        const problem =
          error instanceof ImageError
            ? error
            : new ImageError('network', { code: 'ERROR' });
        return outcome(
          'failed',
          imageIssue(problem, { rowNumber, column: 'image', value: source })
        );
      }
    }

    try {
      if (existing) {
        // The key is the identity of the row, so it is not sent. A parent that is
        // already the parent is not sent either: a change of parent moves the
        // whole subtree.
        const input = serviceInput(data, {
          withKey: false,
          image,
          parentId:
            parentKey !== undefined && existing.parentUrlKey === parentKey
              ? undefined
              : parentId
        });
        if (Object.keys(input).length > 0) {
          await withRetries(
            () => services.updateCategory(existing.uuid, input),
            {
              isTransient: isTransientDatabaseError,
              sleep: clock.sleep,
              onRetry: countRetry,
              signal
            }
          );
        }
        return outcome('updated');
      }
      await withRetries(
        () =>
          services.createCategory(
            serviceInput(data, { withKey: true, image, parentId })
          ),
        {
          isTransient: isTransientDatabaseError,
          sleep: clock.sleep,
          onRetry: countRetry,
          signal
        }
      );
      return outcome('created');
    } catch (error) {
      return outcome('failed', failure(error, row));
    }
  }
}
