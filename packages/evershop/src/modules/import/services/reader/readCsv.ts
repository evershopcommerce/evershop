import { pipeline } from 'stream';
import type { Readable } from 'stream';
import csvParser from 'csv-parser';
import { createIssue } from '../issues.js';
import type { ImportIssue } from '../types.js';
import { CsvFileError, CsvFileGuard } from './csvFileGuard.js';

export interface CsvLimits {
  /** Data rows (not the header, not blank rows). More is `FILE_TOO_LARGE`. */
  maxRows: number;
  /** Characters in one cell (ALL-12). */
  maxCellLength: number;
  /** Bytes in one row, line break included. A constant, not a setting. */
  maxRowBytes: number;
}

export const DEFAULT_CSV_LIMITS: Readonly<CsvLimits> = Object.freeze({
  maxRows: 200_000,
  maxCellLength: 65_536,
  maxRowBytes: 1_048_576
});

/** The column the "file with errors" download adds (ALL-19). */
export const ERRORS_COLUMN = '_errors';

export interface CsvRow {
  /** The row as a spreadsheet shows it: the first line of the file is row 1. */
  rowNumber: number;
  /**
   * The cells as written, not trimmed. They line up with the header's
   * `columns`, unless the row has a `ROW_WIDTH` issue: then they are the cells
   * of the file as they are.
   */
  cells: string[];
  /** The row has an issue of severity `error`; later stages leave it alone. */
  hasError: boolean;
}

/**
 * What `readCsv` yields, in file order. The issues of a row come before the
 * row itself, so a consumer that sees the row has seen all of its issues.
 */
export type CsvEvent =
  | {
      type: 'header';
      /** The row number of the header (1, unless blank lines come first). */
      rowNumber: number;
      /** Trimmed names. `_errors` is left out. A blank name stays blank. */
      columns: string[];
    }
  | { type: 'row'; row: CsvRow }
  | { type: 'issue'; issue: ImportIssue }
  /** Always the last event. `stopped`: a file-level issue ended the reading. */
  | { type: 'end'; dataRows: number; stopped: boolean };

function cellLimitIssue(
  rowNumber: number,
  column: string,
  cell: string,
  maxCellLength: number
): ImportIssue | null {
  if (cell.length > maxCellLength) {
    return createIssue({
      code: 'INVALID_VALUE',
      rowNumber,
      column,
      params: { reason: 'too_long', maxLength: maxCellLength },
      message: `The value in column "${column}" is longer than ${maxCellLength} characters.`,
      value: cell
    });
  }
  if (cell.indexOf('\u0000') !== -1) {
    return createIssue({
      code: 'INVALID_VALUE',
      rowNumber,
      column,
      params: { reason: 'nul' },
      message: `The value in column "${column}" contains a NUL character (U+0000), which cannot be stored.`
    });
  }
  return null;
}

function fileErrorIssue(error: CsvFileError): ImportIssue {
  const { code, params } = error;
  if (code === 'FILE_ENCODING') {
    return createIssue({
      code,
      params,
      message:
        params.reason === 'utf16'
          ? 'The file is saved as UTF-16 ("Unicode Text"). Save it as "CSV UTF-8 (Comma delimited)" instead.'
          : 'The file is not valid UTF-8 text. Save it as "CSV UTF-8 (Comma delimited)".'
    });
  }
  if (code === 'UNCLOSED_QUOTE') {
    return createIssue({
      code,
      params,
      message: `A quote character (") that opens in row ${params.row} is never closed. A quote inside a cell must be written twice ("") and a cell that holds a comma, a quote or a line break must be wrapped in quotes.`
    });
  }
  return createIssue({
    code,
    params,
    message: params.quoteOpen
      ? `Row ${params.row} is larger than ${params.maxRowBytes} bytes. A quote character (") that opens in it is probably never closed. A quote inside a cell must be written twice ("") and a cell that holds a comma, a quote or a line break must be wrapped in quotes.`
      : `Row ${params.row} is larger than ${params.maxRowBytes} bytes.`
  });
}

interface Header {
  columns: string[];
  /** The positions in the file of the cells that are kept. */
  keep: number[];
  /** The number of cells the file has in every row. */
  width: number;
  issues: ImportIssue[];
  /** The file cannot be read as a CSV file; stop. */
  fatal: boolean;
}

function readHeader(cells: string[]): Header {
  const width = cells.length;
  if (width === 1 && /[;\t]/.test(cells[0])) {
    const delimiter = cells[0].includes(';') ? ';' : '\t';
    return {
      columns: [],
      keep: [],
      width,
      fatal: true,
      issues: [
        createIssue({
          code: 'WRONG_DELIMITER',
          params: { delimiter },
          message: `The header row is a single column that contains ${
            delimiter === ';' ? 'a semicolon (;)' : 'a tab'
          }. The file must be comma-separated: save it as "CSV (Comma delimited)".`
        })
      ]
    };
  }
  const columns: string[] = [];
  const keep: number[] = [];
  const positions = new Map<string, number[]>();
  cells.forEach((cell, index) => {
    const name = cell.trim();
    if (name === ERRORS_COLUMN) {
      return;
    }
    columns.push(name);
    keep.push(index);
    if (name !== '') {
      positions.set(name, [...(positions.get(name) ?? []), index + 1]);
    }
  });
  const issues: ImportIssue[] = [];
  positions.forEach((where, name) => {
    if (where.length > 1) {
      issues.push(
        createIssue({
          code: 'DUPLICATE_COLUMN',
          column: name,
          params: { column: name, positions: where },
          message: `The column "${name}" appears more than once (columns ${where.join(
            ', '
          )}).`
        })
      );
    }
  });
  return { columns, keep, width, issues, fatal: false };
}

/**
 * Reads a CSV file as a stream of events, row by row, in constant memory.
 *
 * It does the work that belongs to the file and not to an entity: UTF-8 and the
 * byte order mark, the delimiter, the header, the width of every row, blank
 * lines, the size of a row, the number of rows, and the limits on a cell. It
 * does not know what the columns mean; turning cells into values is the job of
 * the stage after it.
 *
 * Problems are reported as events and not thrown. A problem with the file as a
 * whole (`stopped` on the last event) ends the reading. A failing `source`
 * (the database, a socket) is not a problem with the file and is thrown.
 * Stopping the iteration early destroys the source.
 */
export async function* readCsv(
  source: Readable,
  limitOverrides: Partial<CsvLimits> = {}
): AsyncGenerator<CsvEvent, void, undefined> {
  const limits: CsvLimits = { ...DEFAULT_CSV_LIMITS, ...limitOverrides };
  const guard = new CsvFileGuard(limits.maxRowBytes);
  // The guard stops a row at maxRowBytes; this is only the last line of defence.
  const parser = csvParser({
    headers: false,
    maxRowBytes: limits.maxRowBytes * 4
  });
  const records = pipeline(source, guard, parser, () => undefined);

  let header: Header | null = null;
  let rowNumber = 0;
  let dataRows = 0;
  let stopped = false;
  try {
    for await (const record of records as AsyncIterable<
      Record<string, string>
    >) {
      rowNumber += 1;
      const cells = Object.values(record);
      if (cells.every((cell) => cell.trim() === '')) {
        // A blank line, or a row of empty cells (Excel leaves rows like `,,,`
        // at the end of a sheet). It counts as a row, as in a spreadsheet, and
        // it is never a data row, whatever its width.
        continue;
      }
      if (header === null) {
        header = readHeader(cells);
        for (const issue of header.issues) {
          yield { type: 'issue', issue };
        }
        if (header.fatal) {
          stopped = true;
          break;
        }
        yield { type: 'header', rowNumber, columns: header.columns };
        continue;
      }
      dataRows += 1;
      if (dataRows > limits.maxRows) {
        yield {
          type: 'issue',
          issue: createIssue({
            code: 'FILE_TOO_LARGE',
            params: { reason: 'rows', maxRows: limits.maxRows },
            message: `The file has more than ${limits.maxRows} data rows. Split it into smaller files.`
          })
        };
        stopped = true;
        break;
      }
      const issues: ImportIssue[] = [];
      let rowCells = cells;
      if (cells.length !== header.width) {
        issues.push(
          createIssue({
            code: 'ROW_WIDTH',
            rowNumber,
            params: { expected: header.width, actual: cells.length },
            message: `Row ${rowNumber} has ${cells.length} cells but the header has ${header.width}. A cell that holds a comma, a quote or a line break must be wrapped in quotes.`
          })
        );
      } else {
        if (header.keep.length !== cells.length) {
          rowCells = header.keep.map((index) => cells[index]);
        }
        const { columns } = header;
        rowCells.forEach((cell, index) => {
          const issue = cellLimitIssue(
            rowNumber,
            columns[index],
            cell,
            limits.maxCellLength
          );
          if (issue) {
            issues.push(issue);
          }
        });
      }
      for (const issue of issues) {
        yield { type: 'issue', issue };
      }
      yield {
        type: 'row',
        row: {
          rowNumber,
          cells: rowCells,
          hasError: issues.some((issue) => issue.severity === 'error')
        }
      };
    }
    if (!stopped && (header === null || dataRows === 0)) {
      const noHeader = header === null;
      yield {
        type: 'issue',
        issue: createIssue({
          code: 'FILE_EMPTY',
          params: { reason: noHeader ? 'no_header' : 'no_rows' },
          message: noHeader
            ? 'The file is empty. It needs a header row and at least one data row.'
            : 'The file has a header row but no data rows.'
        })
      };
    }
  } catch (e) {
    if (!(e instanceof CsvFileError)) {
      throw e;
    }
    stopped = true;
    yield { type: 'issue', issue: fileErrorIssue(e) };
  }
  yield { type: 'end', dataRows, stopped };
}
