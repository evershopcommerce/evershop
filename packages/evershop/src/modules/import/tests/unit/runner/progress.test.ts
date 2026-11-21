import { Readable } from 'stream';
import { describe, expect, it } from '@jest/globals';
import {
  categoryFile,
  categoryRow
} from '../../../services/rules/categoryFiles.js';
import { runImport, runValidation } from '../../../services/runner/index.js';
import { harness } from '../helpers/harness.js';

/**
 * The progress of a check (§ 8.4): the bytes read against the size of the file,
 * pass by pass, and the stage; and the mark that tells the page an import was
 * running beside it.
 */
const FILE = categoryFile(
  ...Array.from({ length: 30 }, (_, i) =>
    categoryRow({ url_key: `k${i}`, name: `K${i}`, image: '' })
  )
);

/** The file in chunks of `size` bytes, with a pause (the fake clock) after the first of each read. */
function slowFile(h: ReturnType<typeof harness>, size: number) {
  const real = h.deps.files.open.bind(h.deps.files);
  const seen: Array<{
    stage: string | null;
    bytesRead: number;
    status: string;
  }> = [];
  /** The job as the heartbeat shows it before the first byte of a pass has come. */
  const before: Array<{ stage: string | null; bytesRead: number }> = [];
  h.deps.files.open = (id: number) => {
    const source = real(id);
    return Readable.from(
      (async function* paced() {
        let first = true;
        // A pass that has begun and has read nothing yet.
        await h.clock.advance(2500);
        const job = h.jobs.snapshot(1);
        before.push({ stage: job.stage, bytesRead: job.counts.bytesRead });
        for await (const chunk of source) {
          const buffer = Buffer.from(chunk);
          for (let at = 0; at < buffer.length; at += size) {
            yield buffer.subarray(at, at + size);
            if (first) {
              first = false;
              // The first chunk has been counted; the heartbeat looks at the job.
              await h.clock.advance(2500);
              const job = h.jobs.snapshot(1);
              seen.push({
                stage: job.stage,
                bytesRead: job.counts.bytesRead,
                status: job.status
              });
            }
          }
        }
      })()
    );
  };
  return { seen, before };
}

describe('runValidation: the progress', () => {
  it('shows the bytes read of each pass, from zero, with the stage it is in', async () => {
    const h = harness();
    const size = Buffer.byteLength(FILE);
    h.stage(FILE, { status: 'uploaded' });
    const { seen, before } = slowFile(h, 64);
    const result = await runValidation(1, h.deps);
    expect(result.outcome).toBe('validated');
    // The second pass begins at zero, not at the end of the first.
    expect(before).toEqual([
      { stage: 'reading', bytesRead: 0 },
      { stage: 'lookups', bytesRead: 0 }
    ]);
    expect(seen.map((s) => s.stage)).toEqual(['reading', 'lookups']);
    for (const look of seen) {
      expect(look.status).toBe('validating');
      expect(look.bytesRead).toBeGreaterThan(0);
      expect(look.bytesRead).toBeLessThan(size);
    }
    // The last pass read the whole file.
    expect(h.jobs.snapshot(1).counts.bytesRead).toBe(size);
  });

  it('the check at the start of an import counts the same way, and the import then leaves it', async () => {
    const h = harness();
    h.stage(FILE, { status: 'queued' });
    await runImport(1, h.deps);
    const counts = h.jobs.snapshot(1).counts;
    expect(counts.bytesRead).toBe(Buffer.byteLength(FILE));
    expect(counts.overlappedImport).toBeNull();
  });
});

describe('runValidation: an import beside the check (overlappedImport)', () => {
  const stageOther = (
    h: ReturnType<typeof harness>,
    status: 'queued' | 'running'
  ) => h.jobs.insert({ id: 2, entity: 'category', status });

  it('names the entity of an import that was queued or running when the check began', async () => {
    for (const status of ['queued', 'running'] as const) {
      const h = harness();
      h.stage('sku\nA\n', { id: 1, entity: 'product', status: 'uploaded' });
      stageOther(h, status);
      // eslint-disable-next-line no-await-in-loop
      await runValidation(1, h.deps);
      expect([status, h.jobs.snapshot(1).counts.overlappedImport]).toEqual([
        status,
        'category'
      ]);
    }
  });

  it('names the entity of an import that began while the file was checked', async () => {
    const h = harness();
    h.stage('sku\nA\n', { id: 1, entity: 'product', status: 'uploaded' });
    h.lookup.products = async (skus) => {
      stageOther(h, 'running');
      return new Map(skus.length ? [] : []);
    };
    await runValidation(1, h.deps);
    expect(h.jobs.snapshot(1).counts.overlappedImport).toBe('category');
  });

  it('names the import of the start when another is there at the end', async () => {
    const h = harness();
    h.stage('sku\nA\n', { id: 1, entity: 'product', status: 'uploaded' });
    const first = stageOther(h, 'running');
    h.lookup.products = async () => {
      h.jobs.setStatus(first.id, 'completed');
      h.jobs.insert({ id: 3, entity: 'customer', status: 'running' });
      return new Map();
    };
    await runValidation(1, h.deps);
    expect(h.jobs.snapshot(1).counts.overlappedImport).toBe('category');
  });

  it('is null when no import was there, and when the other one ended before the check began', async () => {
    const h = harness();
    h.stage('sku\nA\n', { id: 1, entity: 'product', status: 'uploaded' });
    h.jobs.insert({ id: 2, entity: 'category', status: 'completed' });
    await runValidation(1, h.deps);
    expect(h.jobs.snapshot(1).counts.overlappedImport).toBeNull();
  });

  it('does not stop the check when the running imports cannot be looked up, and says so', async () => {
    const h = harness();
    h.stage('sku\nA\n', { id: 1, entity: 'product', status: 'uploaded' });
    h.deps.jobs.busyImport = async () => {
      throw new Error('connection terminated');
    };
    const result = await runValidation(1, h.deps);
    expect(result.outcome).toBe('validated');
    expect(h.jobs.snapshot(1).counts.overlappedImport).toBeNull();
    expect(
      h.logger.of('warn').some((l) => /could not be looked up/.test(l.message))
    ).toBe(true);
  });
});
