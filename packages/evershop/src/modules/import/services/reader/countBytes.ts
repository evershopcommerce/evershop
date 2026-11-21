import { PassThrough } from 'stream';
import type { Readable } from 'stream';

/**
 * The same bytes, counted as they pass (the progress of a check is the bytes
 * read against the size of the file, § 8.4). It adds nothing to a chunk and holds
 * nothing back: a chunk is counted when it is taken from the source, and the
 * stream ends and fails as the source does.
 */
export function countBytes(
  source: Readable,
  onBytes: (total: number) => void
): Readable {
  let total = 0;
  const counter = new PassThrough();
  source.on('error', (error) => counter.destroy(error));
  source.on('data', (chunk: Buffer | string) => {
    total +=
      typeof chunk === 'string' ? Buffer.byteLength(chunk) : chunk.length;
    onBytes(total);
  });
  return source.pipe(counter);
}
