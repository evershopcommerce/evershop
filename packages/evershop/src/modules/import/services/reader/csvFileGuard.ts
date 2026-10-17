import { Transform } from 'stream';
import type { TransformCallback } from 'stream';

const QUOTE = 0x22;
const LF = 0x0a;
const CR = 0x0d;

export type CsvFileErrorCode =
  | 'FILE_ENCODING'
  | 'UNCLOSED_QUOTE'
  | 'ROW_TOO_LARGE';

/** A problem with the file as a whole. It stops the reading. */
export class CsvFileError extends Error {
  readonly code: CsvFileErrorCode;

  readonly params: Record<string, unknown>;

  constructor(code: CsvFileErrorCode, params: Record<string, unknown>) {
    super(code);
    this.name = 'CsvFileError';
    this.code = code;
    this.params = params;
  }
}

/**
 * Sits in front of `csv-parser` and does what the library cannot:
 *
 * - removes a UTF-8 byte order mark (the library keeps it in the first header
 *   name) and refuses a file that is not UTF-8 (the library turns bad bytes
 *   into U+FFFD without a word);
 * - counts the rows by itself, so that an error can name the row. The library
 *   gives no row numbers, and when it fails it drops the rows it has not
 *   handed over yet;
 * - stops a row that grows past `maxRowBytes`, and a quote that is never
 *   closed by the end of the file. One stray quote makes the library read the
 *   rest of the file as a single cell, in memory;
 * - makes the line breaks something the library can read. Without a header
 *   option it does not look for the style of line break (the old Macintosh CSV
 *   ends a row with a lone CR), and when it does look, a CR LF that is cut
 *   between two chunks fools it. So a lone CR outside quotes becomes LF, and a
 *   CR at the end of a chunk is held back until the next byte is known.
 *
 * Everything else goes through unchanged.
 */
export class CsvFileGuard extends Transform {
  // The first bytes, held back until we know whether they are a byte order mark.
  private head: Buffer = Buffer.alloc(0);

  private started = false;

  private readonly decoder = new TextDecoder('utf-8', { fatal: true });

  private inQuotes = false;

  private quoteOpenedInRow = 0;

  // A carriage return outside quotes was the last byte of the previous chunk
  // and has been held back: whether it ends a row on its own or is the first
  // half of CR LF depends on the first byte of this chunk.
  private pendingCR = false;

  private rowBytes = 0;

  private rowsDone = 0;

  constructor(private readonly maxRowBytes: number) {
    super();
  }

  _transform(
    chunk: Buffer,
    _encoding: BufferEncoding,
    callback: TransformCallback
  ): void {
    try {
      let data = chunk;
      if (!this.started) {
        this.head = Buffer.concat([this.head, chunk]);
        if (this.head.length < 3) {
          callback();
          return;
        }
        data = this.start();
      }
      const out = this.inspect(data);
      callback(null, out.length > 0 ? out : undefined);
    } catch (e) {
      callback(e as Error);
    }
  }

  _flush(callback: TransformCallback): void {
    try {
      if (!this.started) {
        // A file shorter than three bytes.
        const out = this.inspect(this.start());
        if (out.length > 0) {
          this.push(out);
        }
      }
      try {
        // Throws when the last character is cut off.
        this.decoder.decode();
      } catch {
        throw new CsvFileError('FILE_ENCODING', { reason: 'invalid_utf8' });
      }
      if (this.inQuotes) {
        throw new CsvFileError('UNCLOSED_QUOTE', {
          row: this.quoteOpenedInRow
        });
      }
      if (this.pendingCR) {
        // The file ends with a lone CR: it ends the last row.
        this.push(Buffer.from([LF]));
      }
      callback();
    } catch (e) {
      callback(e as Error);
    }
  }

  // Decides about the byte order mark and returns the bytes without it.
  private start(): Buffer {
    this.started = true;
    const { head } = this;
    this.head = Buffer.alloc(0);
    const first = head[0];
    const second = head[1];
    if (
      (first === 0xff && second === 0xfe) ||
      (first === 0xfe && second === 0xff)
    ) {
      // A UTF-16 byte order mark: Excel's "Unicode Text".
      throw new CsvFileError('FILE_ENCODING', { reason: 'utf16' });
    }
    if (first === 0xef && second === 0xbb && head[2] === 0xbf) {
      return head.subarray(3);
    }
    return head;
  }

  // Checks the bytes and returns what the parser is to get.
  private inspect(data: Buffer): Buffer {
    try {
      this.decoder.decode(data, { stream: true });
    } catch {
      throw new CsvFileError('FILE_ENCODING', { reason: 'invalid_utf8' });
    }
    return this.scan(data);
  }

  private endRow(): void {
    this.rowsDone += 1;
    this.rowBytes = 0;
  }

  // Counts rows, enforces the limits and fixes the line breaks.
  private scan(data: Buffer): Buffer {
    // The CR held back from the previous chunk: CR LF goes on as it is, a lone
    // CR becomes LF.
    let lead: Buffer | null = null;
    if (this.pendingCR) {
      this.pendingCR = false;
      if (data.length > 0 && data[0] === LF) {
        lead = Buffer.from([CR]);
      } else {
        lead = Buffer.from([LF]);
        this.endRow();
      }
    }
    let out = data;
    let copied = false;
    let hold = false;
    for (let i = 0; i < data.length; i += 1) {
      const byte = data[i];
      this.rowBytes += 1;
      if (this.rowBytes > this.maxRowBytes) {
        // Inside a quote, most likely one that is never closed.
        throw new CsvFileError('ROW_TOO_LARGE', {
          row: this.rowsDone + 1,
          maxRowBytes: this.maxRowBytes,
          quoteOpen: this.inQuotes
        });
      }
      if (byte === QUOTE) {
        this.inQuotes = !this.inQuotes;
        if (this.inQuotes) {
          this.quoteOpenedInRow = this.rowsDone + 1;
        }
      } else if (!this.inQuotes) {
        if (byte === LF) {
          this.endRow();
        } else if (byte === CR) {
          if (i + 1 === data.length) {
            this.pendingCR = true;
            hold = true;
          } else if (data[i + 1] !== LF) {
            if (!copied) {
              // The chunk belongs to the source: change a copy.
              out = Buffer.from(data);
              copied = true;
            }
            out[i] = LF;
            this.endRow();
          }
        }
      }
    }
    if (hold) {
      out = out.subarray(0, out.length - 1);
    }
    return lead ? Buffer.concat([lead, out]) : out;
  }
}
