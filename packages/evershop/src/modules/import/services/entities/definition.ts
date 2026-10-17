import type { Lookup } from '../ports/lookup.js';
import type { CsvRow } from '../reader/readCsv.js';
import type { ImportEntity, ImportIssue, ImportMode } from '../types.js';

/** The header of the file as the reader returned it. */
export interface HeaderInfo {
  columns: readonly string[];
  /** The position of each named column (the first one, if a name repeats). */
  position: ReadonlyMap<string, number>;
}

/** What a validation needs from the outside (§ 4.5): all of it injected. */
export interface ValidationContext {
  lookup: Lookup;
  mode: ImportMode;
  /** Milliseconds, for the time in a description (the Clock port). */
  now: () => number;
  /** SHA-256 of a text as hexadecimal digits (the Ids port). */
  sha256Hex: (text: string) => string;
}

/** A row after its cells are converted (layer C). */
export interface ConvertedRow<D = unknown> {
  rowNumber: number;
  /** The natural key, or null when the row has none that can be used. */
  key: string | null;
  /** An example row of the template (ALL-18): reported and skipped. */
  example: boolean;
  /** The row has the wrong width or a cell the reader refused: already reported. */
  broken: boolean;
  data: D;
  /**
   * Columns that have a cell the row cannot use. The cell is already reported,
   * so a rule that asks "is it there?" must not say it is missing as well.
   */
  invalid: string[];
  /** The issues of the cells of this row. */
  issues: ImportIssue[];
}

export interface BatchResult {
  issues: ImportIssue[];
  createRows: number;
  updateRows: number;
}

/**
 * What an entity brings to the validation (§ 4): its header, how a row is
 * converted, what is remembered across rows, and the checks that need the
 * store. The validation (`validateFile`) is the same for every entity.
 *
 * `State` is everything that is remembered across rows. It must stay small
 * (keys and links, not rows): a file can have 200,000 rows.
 */
export interface EntityValidator<D = unknown, State = unknown> {
  entity: ImportEntity;
  /** Layer F: the header. `fatal` stops the check. */
  checkHeader(
    header: HeaderInfo,
    ctx: ValidationContext
  ): Promise<{ issues: ImportIssue[]; fatal: boolean }>;
  createState(): State;
  /** Layer C: converts the cells of one row. Pure. */
  convert(
    row: CsvRow,
    header: HeaderInfo,
    ctx: ValidationContext
  ): ConvertedRow<D>;
  /** Layer X, first pass: remembers the row; returns what is wrong across rows. */
  index(state: State, row: ConvertedRow<D>): ImportIssue[];
  /** Layers M, S, R, K and X, second pass: the rows of one batch. */
  checkBatch(
    rows: ConvertedRow<D>[],
    state: State,
    ctx: ValidationContext
  ): Promise<BatchResult>;
}
