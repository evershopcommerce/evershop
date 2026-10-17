import type { Readable } from 'stream';
import type {
  EntityValidator,
  HeaderInfo,
  ValidationContext
} from '../entities/definition.js';
import { createIssue } from '../issues.js';
import { readCsv } from '../reader/readCsv.js';
import type { CsvLimits } from '../reader/readCsv.js';
import type { ImportIssue } from '../types.js';

export interface ValidationSummary {
  /** The data rows of the file (not the header, not blank rows). */
  totalRows: number;
  createRows: number;
  updateRows: number;
  /** Rows of the template's examples, skipped (ALL-18). */
  exampleRows: number;
  errors: number;
  warnings: number;
  /** The number of issues for each code, whatever the cap on stored issues. */
  byCode: Record<string, number>;
  /** A problem with the whole file ended the check. */
  stopped: boolean;
  /** The abort signal ended the check. */
  canceled: boolean;
}

export interface ValidateFileArgs {
  validator: EntityValidator;
  context: ValidationContext;
  /** Opens the file; called once for each pass, so the file is never held. */
  open: () => Readable;
  limits?: Partial<CsvLimits>;
  /** Each issue, with the natural key of its row when it has one. */
  onIssue: (issue: ImportIssue, key: string | null) => void | Promise<void>;
  signal?: AbortSignal;
  /** Rows in one batch of the second pass (about 1,000: § 8.5). */
  batchSize?: number;
}

const DEFAULT_BATCH_SIZE = 1000;

/**
 * Checks a whole file without writing anything (§ 7): the dry run, and the
 * check at the start of an import.
 *
 * It reads the file twice, so that no row is held in memory. The first pass
 * checks the header, converts every cell (layer C) and remembers what the rows
 * have to do with each other (a key twice, the parent of a category). The second
 * pass takes the rows in batches, asks the store about each batch, and runs the
 * rules that need the store or the first pass.
 */
export async function validateFile(
  args: ValidateFileArgs
): Promise<ValidationSummary> {
  const { validator, context, open, onIssue, signal } = args;
  const batchSize = args.batchSize ?? DEFAULT_BATCH_SIZE;
  const summary: ValidationSummary = {
    totalRows: 0,
    createRows: 0,
    updateRows: 0,
    exampleRows: 0,
    errors: 0,
    warnings: 0,
    byCode: {},
    stopped: false,
    canceled: false
  };
  const emit = async (issue: ImportIssue, key: string | null) => {
    if (issue.severity === 'error') {
      summary.errors += 1;
    } else {
      summary.warnings += 1;
    }
    summary.byCode[issue.code] = (summary.byCode[issue.code] ?? 0) + 1;
    await onIssue(issue, key);
  };

  const state = validator.createState();
  const first = await firstPass({
    validator,
    context,
    open,
    limits: args.limits,
    signal,
    state,
    emit,
    summary
  });
  const { header } = first;
  if (summary.canceled || summary.stopped || header === null) {
    return summary;
  }

  // Pass 2: the rules that need the store.
  let batch: ReturnType<typeof validator.convert>[] = [];
  const keys = new Map<number, string | null>();
  const flush = async () => {
    if (batch.length === 0) {
      return;
    }
    const result = await validator.checkBatch(batch, state, context);
    summary.createRows += result.createRows;
    summary.updateRows += result.updateRows;
    for (const issue of result.issues) {
      await emit(
        issue,
        issue.rowNumber === undefined ? null : keys.get(issue.rowNumber) ?? null
      );
    }
    batch = [];
    keys.clear();
  };
  for await (const event of readCsv(open(), args.limits)) {
    if (signal?.aborted) {
      summary.canceled = true;
      return summary;
    }
    if (event.type === 'row') {
      const row = validator.convert(event.row, header, context);
      if (!row.example && !row.broken && row.key !== null) {
        batch.push(row);
        keys.set(row.rowNumber, row.key);
        if (batch.length >= batchSize) {
          await flush();
        }
      }
    }
  }
  await flush();
  return summary;
}

function headerInfo(columns: string[]): HeaderInfo {
  const position = new Map<string, number>();
  columns.forEach((name, at) => {
    if (name !== '' && !position.has(name)) {
      position.set(name, at);
    }
  });
  return { columns, position };
}

interface FirstPassArgs {
  validator: EntityValidator;
  context: ValidationContext;
  open: () => Readable;
  limits?: Partial<CsvLimits>;
  signal?: AbortSignal;
  state: unknown;
  emit: (issue: ImportIssue, key: string | null) => Promise<void>;
  summary: ValidationSummary;
}

// Pass 1: header, cells, and what the rows have to do with each other.
async function firstPass(
  args: FirstPassArgs
): Promise<{ header: HeaderInfo | null }> {
  const { validator, context, signal, state, emit, summary } = args;
  let header: HeaderInfo | null = null;
  // Columns that have no name: a cell with something in it is not read (once).
  const blankWarned = new Set<number>();
  for await (const event of readCsv(args.open(), args.limits)) {
    if (signal?.aborted) {
      summary.canceled = true;
      return { header };
    }
    if (event.type === 'issue') {
      await emit(event.issue, null);
    } else if (event.type === 'header') {
      header = headerInfo(event.columns);
      const checked = await validator.checkHeader(header, context);
      for (const issue of checked.issues) {
        await emit(issue, null);
      }
      if (checked.fatal) {
        summary.stopped = true;
        break;
      }
    } else if (event.type === 'row' && header) {
      const row = validator.convert(event.row, header, context);
      for (const issue of row.issues) {
        await emit(issue, row.key);
      }
      if (row.example) {
        summary.exampleRows += 1;
      } else if (!row.broken) {
        for (const issue of validator.index(state, row)) {
          await emit(issue, row.key);
        }
      }
      for (let at = 0; at < header.columns.length; at += 1) {
        if (
          header.columns[at] === '' &&
          !blankWarned.has(at) &&
          (event.row.cells[at] ?? '').trim() !== ''
        ) {
          blankWarned.add(at);
          await emit(
            createIssue({
              code: 'UNKNOWN_COLUMN',
              rowNumber: event.row.rowNumber,
              params: { position: at + 1 },
              message: `Column ${
                at + 1
              } has no name, so its values are not read.`
            }),
            row.key
          );
        }
      }
    } else if (event.type === 'end') {
      summary.totalRows = event.dataRows;
      summary.stopped = summary.stopped || event.stopped;
    }
  }
  return { header };
}

export interface IndexedFile<State = unknown> {
  header: HeaderInfo | null;
  /** What the rows have to do with each other: the keys, the links. */
  state: State;
  stopped: boolean;
  canceled: boolean;
}

/**
 * The first pass alone: reads the file and returns what the rows have to do with
 * each other, without a word about what is wrong. The plan of an import is built
 * from it, and so is a resumed one, which does not validate again.
 */
export async function indexFile<State = unknown>(args: {
  validator: EntityValidator<unknown, State>;
  context: ValidationContext;
  open: () => Readable;
  limits?: Partial<CsvLimits>;
  signal?: AbortSignal;
}): Promise<IndexedFile<State>> {
  const state = args.validator.createState();
  const summary: ValidationSummary = {
    totalRows: 0,
    createRows: 0,
    updateRows: 0,
    exampleRows: 0,
    errors: 0,
    warnings: 0,
    byCode: {},
    stopped: false,
    canceled: false
  };
  const { header } = await firstPass({
    ...args,
    validator: args.validator as EntityValidator,
    state,
    emit: async () => undefined,
    summary
  });
  return {
    header,
    state,
    stopped: summary.stopped,
    canceled: summary.canceled
  };
}
