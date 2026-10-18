import { createHash } from 'crypto';
import { Readable } from 'stream';
import type { Pool } from 'pg';
import { FileDamagedError } from '../services/job/errors.js';
import type { FileStore } from '../services/ports/fileStore.js';

/**
 * The uploaded file, read from its chunks in `import_job_file` (§ 8.4, Reader
 * contract). The upload writes the chunks and records the final size, chunk
 * count and SHA-256 on the job in the swap; this reads them back and **asserts**
 * what was recorded before it gives the first byte:
 *
 * - the sequence numbers are contiguous from 0, so a missing chunk is never
 *   taken for the end of the file;
 * - the count, the total size and the SHA-256 are the recorded ones, so a
 *   changed byte is never read as data.
 *
 * That takes one pass over the chunks to check and a second to give them, one
 * chunk at a time, so memory stays at about two chunks for a file of any size.
 * A job whose upload is not complete (no recorded SHA-256) has no file yet.
 */
export class PgFileStore implements FileStore {
  constructor(private readonly pool: Pool) {}

  open(jobId: number): Readable {
    return Readable.from(this.read(jobId), { objectMode: false });
  }

  /** The chunk at `seq`, or null when there is none. */
  private async chunk(jobId: number, seq: number): Promise<Buffer | null> {
    const result = await this.pool.query(
      `SELECT data FROM import_job_file WHERE import_job_id = $1 AND seq = $2`,
      [jobId, seq]
    );
    return result.rows.length === 0 ? null : (result.rows[0].data as Buffer);
  }

  private async *read(jobId: number): AsyncGenerator<Buffer, void, undefined> {
    const job = await this.pool.query(
      `SELECT file_size, chunk_count, file_sha256 FROM import_job WHERE import_job_id = $1`,
      [jobId]
    );
    if (job.rows.length === 0) {
      throw new FileDamagedError('The uploaded file is missing');
    }
    const recorded = job.rows[0];
    if (recorded.chunk_count === null || recorded.file_sha256 === null) {
      throw new FileDamagedError('The upload of the file is not complete');
    }
    const count = recorded.chunk_count as number;

    // The check comes first, before the first byte.
    const hash = createHash('sha256');
    let size = 0;
    for (let seq = 0; seq < count; seq += 1) {
      const data = await this.chunk(jobId, seq);
      if (data === null) {
        throw new FileDamagedError(
          `Chunk ${seq} of the uploaded file is missing`
        );
      }
      hash.update(data);
      size += data.length;
    }
    const extra = await this.pool.query(
      `SELECT count(*)::int AS n FROM import_job_file WHERE import_job_id = $1`,
      [jobId]
    );
    if (
      extra.rows[0].n !== count ||
      size !== Number(recorded.file_size) ||
      hash.digest('hex') !== recorded.file_sha256
    ) {
      throw new FileDamagedError();
    }

    for (let seq = 0; seq < count; seq += 1) {
      const data = await this.chunk(jobId, seq);
      if (data === null) {
        // Deleted since the check: the job is gone.
        throw new FileDamagedError(
          `Chunk ${seq} of the uploaded file is missing`
        );
      }
      yield data;
    }
  }
}
