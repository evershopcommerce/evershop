import type { Readable } from 'stream';

/**
 * The staged file of a job (§ 4.5, point 2). The real one reads the chunks from
 * the database (§ 8.4); the test double keeps the bytes in memory.
 */
export interface FileStore {
  /**
   * The file as a stream. It checks the chunks against what was recorded at the
   * end of the upload (they are contiguous from 0, and the count, the size and
   * the SHA-256 match) **before it gives the first byte**, and fails the stream
   * with `FileDamagedError` when they do not. A missing chunk is never taken for
   * the end of the file, and a changed byte is never read as data (§ 8.4: the
   * hash "is checked before every read").
   */
  open(jobId: number): Readable;
}
