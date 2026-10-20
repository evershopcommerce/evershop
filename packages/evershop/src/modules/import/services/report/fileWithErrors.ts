import type { Readable } from 'stream';
import type { StoredIssue } from '../job/types.js';
import { ERRORS_COLUMN, readCsv } from '../reader/readCsv.js';
import type { CsvLimits } from '../reader/readCsv.js';
import type { ImportEntity } from '../types.js';
import { csvLine } from './csvWrite.js';
import { errorsCell } from './errorsCell.js';
import type { RenderMessage } from './errorsCell.js';

export { READING_STOPPED_CODES } from '../issues.js';

/** What a hidden cell shows (§ 5.4.1). */
export const HIDDEN_CELL = '(hidden)';

const BOM = '﻿';
const CHUNK_SIZE = 64 * 1024;
const BLANK_LINES_AT_A_TIME = 4096;

/** The file could not be read to the end, so a copy of it would look complete and not be. */
export class FileWithErrorsError extends Error {
  constructor() {
    super(
      'The file cannot be read to the end, so no file with errors can be made from it.'
    );
    this.name = 'FileWithErrorsError';
  }
}

/** The columns whose cells the download does not give back: a plain-text password. */
function isHiddenColumn(entity: ImportEntity, column: string): boolean {
  return entity === 'customer' && column === 'password';
}

/**
 * Takes the problems of one row at a time from a list that is in row order.
 * Problems of the file as a whole (no row) are on the page, not in the file.
 */
class IssueCursor {
  private readonly iterator: AsyncIterator<StoredIssue>;

  private head: IteratorResult<StoredIssue> | null = null;

  constructor(issues: AsyncIterable<StoredIssue>) {
    this.iterator = issues[Symbol.asyncIterator]();
  }

  async takeRow(rowNumber: number): Promise<StoredIssue[]> {
    const taken: StoredIssue[] = [];
    for (;;) {
      this.head ??= await this.iterator.next();
      if (this.head.done) break;
      const at = this.head.value.rowNumber;
      if (at !== null && at > rowNumber) break;
      if (at === rowNumber) taken.push(this.head.value);
      this.head = null;
    }
    return taken;
  }

  async close(): Promise<void> {
    await this.iterator.return?.();
  }
}

export interface FileWithErrorsArgs {
  entity: ImportEntity;
  /** The stored file, from the start. */
  source: Readable;
  /**
   * The problems of one phase in row order: those without a row first, then by
   * row number, and inside a row in the order they were found
   * (`JobRepository.issuesInRowOrder`).
   */
  issues: AsyncIterable<StoredIssue>;
  /** `counts.firstUnlistedRow` of that phase: from this row on, problems may be missing. */
  firstUnlistedRow?: number | null;
  render?: RenderMessage;
  /** The limits the file was checked with. */
  limits?: Partial<CsvLimits>;
}

/**
 * The file with errors (D-15, § 7.3): every row of the uploaded file, its cells
 * as the reader gave them, and one more column, `_errors`, with the problems of
 * the row. UTF-8 with a byte order mark, CRLF line endings, a cell quoted when it
 * needs it. Streamed in chunks of about 64 KiB, in constant memory.
 *
 * - A column `_errors` that the file already had is replaced (ALL-19): the
 *   reader leaves it out, and the new one is the last column.
 * - A blank line is written as a blank line, so the row numbers of the problems
 *   are the row numbers of the file the admin gets.
 * - A row that has more or fewer cells than the header (`ROW_WIDTH`) is padded
 *   to the width of the header; its extra cells come after `_errors`.
 * - A plain-text `password` cell is written as `(hidden)` (§ 5.4.1).
 *
 * It throws `FileWithErrorsError` when the reader has to stop before the end of
 * the file (a quote that never closes, too many rows): the connection is then
 * destroyed, so that the browser reports a failed download and does not keep a
 * cut file that looks complete. A source that fails is thrown as it is.
 */
export async function* fileWithErrors(
  args: FileWithErrorsArgs
): AsyncGenerator<string, void, undefined> {
  const cursor = new IssueCursor(args.issues);
  const firstUnlisted = args.firstUnlistedRow ?? null;
  let columns: string[] = [];
  let hidden = new Set<number>();
  let lastRow = 0;
  // The byte order mark is the first thing in the file, even when the upload
  // began with blank lines, or Excel does not see it.
  let out = BOM;
  try {
    for await (const event of readCsv(args.source, args.limits)) {
      if (event.type === 'end') {
        if (event.stopped) {
          throw new FileWithErrorsError();
        }
      } else if (event.type === 'header' || event.type === 'row') {
        const rowNumber =
          event.type === 'header' ? event.rowNumber : event.row.rowNumber;
        for (let left = rowNumber - lastRow - 1; left > 0; ) {
          const lines = Math.min(left, BLANK_LINES_AT_A_TIME);
          out += '\r\n'.repeat(lines);
          left -= lines;
          if (out.length >= CHUNK_SIZE) {
            yield out;
            out = '';
          }
        }
        lastRow = rowNumber;
        if (event.type === 'header') {
          columns = event.columns;
          hidden = new Set(
            columns.flatMap((name, index) =>
              isHiddenColumn(args.entity, name) ? [index] : []
            )
          );
          out += csvLine([...columns, ERRORS_COLUMN]);
        } else {
          const { cells } = event.row;
          const issues = await cursor.takeRow(rowNumber);
          const text = errorsCell(issues, {
            columns,
            render: args.render,
            unlisted: firstUnlisted !== null && rowNumber >= firstUnlisted
          });
          const shown = cells.map((cell, index) =>
            hidden.has(index) && cell.trim() !== '' ? HIDDEN_CELL : cell
          );
          const width = columns.length;
          const fitted = shown.slice(0, width);
          while (fitted.length < width) fitted.push('');
          out += csvLine([...fitted, text, ...shown.slice(width)]);
        }
        if (out.length >= CHUNK_SIZE) {
          yield out;
          out = '';
        }
      }
    }
    if (out !== '' && out !== BOM) {
      yield out;
    }
  } finally {
    await cursor.close();
  }
}
