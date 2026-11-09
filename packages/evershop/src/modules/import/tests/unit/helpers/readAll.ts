import { Readable } from 'stream';
import { readCsv } from '../../../services/reader/readCsv.js';
import type {
  CsvEvent,
  CsvLimits,
  CsvRow
} from '../../../services/reader/readCsv.js';
import type { ImportIssue } from '../../../services/types.js';

export interface ReadResult {
  columns?: string[];
  headerRow?: number;
  rows: CsvRow[];
  issues: ImportIssue[];
  dataRows: number;
  stopped: boolean;
  events: CsvEvent[];
}

/** Cuts the input into chunks of `size` bytes (the whole input when absent). */
export function chunked(input: string | Buffer, size?: number): Readable {
  const bytes = typeof input === 'string' ? Buffer.from(input, 'utf8') : input;
  const chunks: Buffer[] = [];
  if (size === undefined) {
    chunks.push(bytes);
  } else {
    for (let at = 0; at < bytes.length; at += size) {
      chunks.push(bytes.subarray(at, at + size));
    }
  }
  return Readable.from(chunks, { objectMode: false });
}

export async function collect(
  source: Readable,
  limits: Partial<CsvLimits> = {}
): Promise<ReadResult> {
  const result: ReadResult = {
    rows: [],
    issues: [],
    dataRows: 0,
    stopped: false,
    events: []
  };
  for await (const event of readCsv(source, limits)) {
    result.events.push(event);
    if (event.type === 'header') {
      result.columns = event.columns;
      result.headerRow = event.rowNumber;
    } else if (event.type === 'row') {
      result.rows.push(event.row);
    } else if (event.type === 'issue') {
      result.issues.push(event.issue);
    } else {
      result.dataRows = event.dataRows;
      result.stopped = event.stopped;
    }
  }
  return result;
}

/** Chunk sizes that put a chunk boundary in every possible place. */
export const CHUNK_SIZES = [undefined, 1, 2, 3, 4, 7, 64] as const;

/**
 * Reads the input once for each chunk size and requires the same result every
 * time: where the stream happens to be cut must never change it.
 *
 * When a problem with the whole file stops the reading, the rows that were read
 * before it may be fewer or more depending on the cut (the stream is destroyed
 * at once), so for those files only the issues and the stop are compared:
 * `same: 'issues'`.
 */
export async function readAll(
  input: string | Buffer,
  limits: Partial<CsvLimits> = {},
  same: 'events' | 'issues' = 'events'
): Promise<ReadResult> {
  const view = (result: ReadResult) =>
    JSON.stringify(
      same === 'events' ? result.events : [result.issues, result.stopped]
    );
  const first = await collect(chunked(input, CHUNK_SIZES[0]), limits);
  for (const size of CHUNK_SIZES.slice(1)) {
    const again = await collect(chunked(input, size), limits);
    if (view(again) !== view(first)) {
      throw new Error(
        `The result depends on the chunk size (${size} bytes):\n` +
          `${view(first)}\n${view(again)}`
      );
    }
  }
  return first;
}
