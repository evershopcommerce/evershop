import { createHash } from 'crypto';
import { Readable } from 'stream';
import { FileDamagedError } from '../services/job/errors.js';
import type { FileStore } from '../services/ports/fileStore.js';

interface Staged {
  chunks: Buffer[];
  size: number;
  chunkCount: number;
  sha256: string;
}

/** The ways `damage` spoils a staged file. `drop-chunk` is `drop-first-chunk`. */
export type FileDamage =
  | 'drop-chunk'
  | 'drop-first-chunk'
  | 'drop-middle-chunk'
  | 'drop-last-chunk'
  | 'extra-chunk'
  | 'flip-byte'
  | 'wrong-size'
  | 'wrong-sha256'
  | 'wrong-count';

/**
 * TEST-ONLY. The staged files of the jobs in memory, in chunks of 1 MiB at most
 * like the real ones. `open` checks the chunks against what was recorded at the
 * end of the upload, as the real one does, before it gives a byte: a missing
 * chunk, a changed byte or a wrong size fails the stream with `FileDamagedError`.
 */
export class MemoryFileStore implements FileStore {
  private readonly files = new Map<number, Staged>();

  /** How many times each job's file was opened. */
  readonly opened = new Map<number, number>();

  constructor(private readonly chunkSize = 1_048_576) {}

  /** Stages a file for a job, with the size, the count and the hash it records. */
  put(
    jobId: number,
    content: string | Buffer,
    chunkSize = this.chunkSize
  ): { size: number; chunkCount: number; sha256: string } {
    const bytes = typeof content === 'string' ? Buffer.from(content) : content;
    const chunks: Buffer[] = [];
    for (let at = 0; at < bytes.length; at += chunkSize) {
      chunks.push(bytes.subarray(at, at + chunkSize));
    }
    const staged: Staged = {
      chunks,
      size: bytes.length,
      chunkCount: chunks.length,
      sha256: createHash('sha256').update(bytes).digest('hex')
    };
    this.files.set(jobId, staged);
    return {
      size: staged.size,
      chunkCount: staged.chunkCount,
      sha256: staged.sha256
    };
  }

  /** Damages the file the way a bad copy would. */
  damage(jobId: number, how: FileDamage): void {
    const staged = this.files.get(jobId);
    if (!staged) throw new Error(`No file for job ${jobId}`);
    switch (how) {
      case 'drop-chunk':
      case 'drop-first-chunk':
        staged.chunks.splice(0, 1);
        break;
      case 'drop-middle-chunk':
        staged.chunks.splice(Math.floor(staged.chunks.length / 2), 1);
        break;
      case 'drop-last-chunk':
        staged.chunks.pop();
        break;
      case 'extra-chunk':
        staged.chunks.push(Buffer.from('x'));
        break;
      case 'wrong-size':
        staged.size += 1;
        break;
      case 'wrong-sha256':
        staged.sha256 =
          (staged.sha256[0] === '0' ? '1' : '0') + staged.sha256.slice(1);
        break;
      case 'wrong-count':
        staged.chunkCount += 1;
        break;
      default: {
        const copy = Buffer.from(staged.chunks[0]);
        copy[0] ^= 0xff;
        staged.chunks[0] = copy;
      }
    }
  }

  open(jobId: number): Readable {
    this.opened.set(jobId, (this.opened.get(jobId) ?? 0) + 1);
    const staged = this.files.get(jobId);
    if (!staged) {
      return Readable.from(
        (async function* missing() {
          throw new FileDamagedError('The uploaded file is missing');
        })()
      );
    }
    // The checks come first, before the first byte (§ 8.4).
    const hash = createHash('sha256');
    let size = 0;
    for (const chunk of staged.chunks) {
      hash.update(chunk);
      size += chunk.length;
    }
    if (
      staged.chunks.length !== staged.chunkCount ||
      size !== staged.size ||
      hash.digest('hex') !== staged.sha256
    ) {
      return Readable.from(
        (async function* damaged() {
          throw new FileDamagedError();
        })()
      );
    }
    return Readable.from(staged.chunks, { objectMode: false });
  }
}
