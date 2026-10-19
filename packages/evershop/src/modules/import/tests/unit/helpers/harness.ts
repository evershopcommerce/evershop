import { createHash } from 'crypto';
import type { ImportConfig, ImportDeps } from '../../../services/deps.js';
import type { ImportJob } from '../../../services/job/types.js';
import type { StoreFixture } from '../../../services/ports/lookup.js';
import { CollectingLogger } from '../../../testing/CollectingLogger.js';
import { FakeClock } from '../../../testing/FakeClock.js';
import { FakeEventBacklog } from '../../../testing/FakeEventBacklog.js';
import { FakeImageFetcher } from '../../../testing/FakeImageFetcher.js';
import { MemoryFileStore } from '../../../testing/MemoryFileStore.js';
import { MemoryJobStore } from '../../../testing/MemoryJobStore.js';
import { MemoryLookup } from '../../../testing/MemoryLookup.js';
import { MemoryPageAddresses } from '../../../testing/MemoryPageAddresses.js';
import { MemoryServices } from '../../../testing/MemoryServices.js';
import { RecordingServices } from '../../../testing/RecordingServices.js';
import { keyDeps } from './runImport.js';

export interface Harness {
  deps: ImportDeps;
  jobs: MemoryJobStore;
  files: MemoryFileStore;
  clock: FakeClock;
  lookup: MemoryLookup;
  memory: MemoryServices;
  services: RecordingServices;
  images: FakeImageFetcher;
  /** The event queue: empty, until a test fills it. */
  backlog: FakeEventBacklog;
  /** The page addresses that the events lost: none, until a test says so. */
  pages: MemoryPageAddresses;
  logger: CollectingLogger;
  /** Stages a file and makes a job for it (by default `uploaded`). */
  stage(file: string | Buffer, fields?: Partial<ImportJob>): ImportJob;
}

/** Everything a run needs, from the doubles of `testing/`. */
export function harness(
  options: { store?: StoreFixture; config?: Partial<ImportConfig> } = {}
): Harness {
  const clock = new FakeClock();
  const files = new MemoryFileStore();
  const jobs = new MemoryJobStore(clock);
  const lookup = new MemoryLookup(options.store);
  const memory = new MemoryServices(lookup);
  const services = new RecordingServices(memory);
  const images = new FakeImageFetcher(keyDeps).hasImage(
    'https://example.com/women.jpg'
  );
  const logger = new CollectingLogger();
  const backlog = new FakeEventBacklog(clock);
  const pages = new MemoryPageAddresses();
  const deps: ImportDeps = {
    files,
    jobs,
    lookup,
    services,
    images,
    backlog,
    pages,
    clock,
    logger,
    config: {
      maxRows: 200_000,
      maxCellLength: 65_536,
      maxIssues: 100_000,
      eventBacklogHigh: 500,
      eventBacklogLow: 100,
      eventBacklogMaxWaitMs: 30 * 60_000,
      ...options.config
    },
    sha256Hex: (text) => createHash('sha256').update(text).digest('hex')
  };
  return {
    deps,
    jobs,
    files,
    clock,
    lookup,
    memory,
    services,
    images,
    backlog,
    pages,
    logger,
    stage(file, fields = {}) {
      const id = fields.id ?? 1;
      const staged = files.put(id, file);
      return jobs.insert({
        id,
        fileSize: staged.size,
        chunkCount: staged.chunkCount,
        fileSha256: staged.sha256,
        ...fields
      });
    }
  };
}
