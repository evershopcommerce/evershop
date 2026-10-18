import { describe, it, expect, beforeEach } from '@jest/globals';
import type { Readable } from 'stream';
import { FileDamagedError } from '../../../services/job/errors.js';
import type { FileStore } from '../../../services/ports/fileStore.js';
import type { FileDamage } from '../../../testing/MemoryFileStore.js';

export type Damage = Exclude<FileDamage, 'drop-chunk'>;

/** The store of files and the ways to stage one and to damage it. */
export interface FileStoreHarness {
  store: FileStore;
  /** Stages a file for a new job, in chunks of `chunkSize` bytes; gives the job. */
  stage(content: string | Buffer, chunkSize?: number): Promise<number>;
  /** A job whose upload is not complete: nothing is recorded about its file. */
  stageIncomplete(): Promise<number>;
  damage(jobId: number, how: Damage): Promise<void>;
  /** A job that does not exist. */
  readonly missingJob: number;
}

interface Outcome {
  data: Buffer;
  /** Chunks that came before the error, if any. */
  chunksBeforeError: number;
  error: Error | null;
}

async function drain(stream: Readable): Promise<Outcome> {
  const chunks: Buffer[] = [];
  try {
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }
    return { data: Buffer.concat(chunks), chunksBeforeError: 0, error: null };
  } catch (e) {
    return {
      data: Buffer.concat(chunks),
      chunksBeforeError: chunks.length,
      error: e as Error
    };
  }
}

/**
 * What every `FileStore` must do (§ 4.5, point 6, § 8.4 Reader contract): give
 * back the file as it was uploaded, and fail with `FileDamagedError` **before
 * the first byte** when it is not that file. It runs against the double in the
 * unit tests and against PostgreSQL in the database tests.
 */
export function fileStoreContract(
  label: string,
  make: () => Promise<FileStoreHarness>
): void {
  describe(`${label}: the contract of a FileStore`, () => {
    let h: FileStoreHarness;

    beforeEach(async () => {
      h = await make();
    });

    describe('a file that is whole', () => {
      it.each([
        ['one chunk', 'sku,name\nA,Alpha\n', 1024],
        ['several chunks', 'sku,name\nA,Alpha\nB,Beta\nC,Gamma\n', 7],
        ['chunks of one byte', 'a,b\n1,2\n', 1],
        ['a file of exactly one chunk', 'abcdefgh', 8],
        ['text cut inside a character', 'é日本語,ü\n€,ß\n', 3]
      ])('gives back %s as it was', async (_name, text, chunkSize) => {
        const id = await h.stage(text, chunkSize);
        const got = await drain(h.store.open(id));
        expect(got.error).toBeNull();
        expect(got.data.toString('utf8')).toBe(text);
      });

      it('gives back bytes as they are, also when they are not text', async () => {
        const bytes = Buffer.from(
          Array.from({ length: 1000 }, (_, n) => (n * 37) % 256)
        );
        const id = await h.stage(bytes, 64);
        const got = await drain(h.store.open(id));
        expect(got.error).toBeNull();
        expect(got.data.equals(bytes)).toBe(true);
      });

      it('gives back an empty file as an empty file', async () => {
        const id = await h.stage('', 8);
        const got = await drain(h.store.open(id));
        expect(got.error).toBeNull();
        expect(got.data.length).toBe(0);
      });

      it('can be opened again and again, also while another read is open', async () => {
        const text = 'a,b\n'.repeat(100);
        const id = await h.stage(text, 10);
        const first = h.store.open(id);
        const second = await drain(h.store.open(id));
        const third = await drain(first);
        expect(second.data.toString()).toBe(text);
        expect(third.data.toString()).toBe(text);
      });

      it('keeps the files of two jobs apart', async () => {
        const a = await h.stage('first,file\n', 4);
        const b = await h.stage('second,file\n', 4);
        expect((await drain(h.store.open(a))).data.toString()).toBe(
          'first,file\n'
        );
        expect((await drain(h.store.open(b))).data.toString()).toBe(
          'second,file\n'
        );
      });

      it('can be stopped half way: the next read is not disturbed', async () => {
        const text = 'x,y\n'.repeat(200);
        const id = await h.stage(text, 16);
        const stream = h.store.open(id);
        for await (const chunk of stream) {
          expect(chunk.length).toBeGreaterThan(0);
          break;
        }
        stream.destroy();
        expect((await drain(h.store.open(id))).data.toString()).toBe(text);
      });
    });

    describe('a file that is not what was uploaded (J1)', () => {
      it.each([
        'drop-first-chunk',
        'drop-middle-chunk',
        'drop-last-chunk',
        'extra-chunk',
        'flip-byte',
        'wrong-size',
        'wrong-sha256',
        'wrong-count'
      ] as const)(
        'fails with FileDamagedError, before the first byte, after %s',
        async (how) => {
          const id = await h.stage('sku,name\nA,Alpha\nB,Beta\nC,Gamma\n', 6);
          await h.damage(id, how);
          const got = await drain(h.store.open(id));
          expect(got.error).toBeInstanceOf(FileDamagedError);
          expect(got.chunksBeforeError).toBe(0);
          expect(got.data.length).toBe(0);
        }
      );

      it('fails with FileDamagedError for a job that has no file', async () => {
        const got = await drain(h.store.open(h.missingJob));
        expect(got.error).toBeInstanceOf(FileDamagedError);
        expect(got.chunksBeforeError).toBe(0);
      });

      it('fails with FileDamagedError for a job whose upload is not complete', async () => {
        const id = await h.stageIncomplete();
        const got = await drain(h.store.open(id));
        expect(got.error).toBeInstanceOf(FileDamagedError);
        expect(got.chunksBeforeError).toBe(0);
      });

      it('checks the file at every read, not only the first', async () => {
        const id = await h.stage('a,b\n1,2\n3,4\n', 4);
        expect((await drain(h.store.open(id))).error).toBeNull();
        await h.damage(id, 'flip-byte');
        expect((await drain(h.store.open(id))).error).toBeInstanceOf(
          FileDamagedError
        );
      });
    });
  });
}
