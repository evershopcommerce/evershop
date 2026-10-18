import { RETENTION_MS } from '../../../services/job/transitions.js';
import { FakeClock } from '../../../testing/FakeClock.js';
import { MemoryFileStore } from '../../../testing/MemoryFileStore.js';
import { MemoryJobRepository } from '../../../testing/MemoryJobRepository.js';
import { MemoryLookup } from '../../../testing/MemoryLookup.js';
import type { FileStoreHarness } from './fileStoreContract.js';
import type { JobRepoHarness } from './jobRepositoryContract.js';
import type { LookupHarness } from './lookupContract.js';

/** The in-memory repository, with a fake clock, as a harness for the contract. */
export function memoryJobHarness(): JobRepoHarness & {
  repo: MemoryJobRepository;
  clock: FakeClock;
} {
  const clock = new FakeClock();
  const repo = new MemoryJobRepository(clock);
  return {
    repo,
    clock,
    async insert(fields) {
      return repo.snapshot(repo.insert(fields).id);
    },
    async snapshot(jobId) {
      return repo.snapshot(jobId);
    },
    async issues(jobId, phase) {
      return repo.issues(jobId, phase);
    },
    async seedIssues(jobId, issues) {
      repo.seedIssues(jobId, issues);
    },
    async setControl(jobId, control) {
      repo.setControl(jobId, control);
    },
    async setStatus(jobId, status) {
      repo.setStatus(jobId, status);
    },
    async delete(jobId) {
      repo.delete(jobId);
    },
    now: () => clock.now(),
    advance: (ms) => clock.advance(ms),
    retentionMs: RETENTION_MS
  };
}

/** The in-memory file store as a harness for the contract. */
export function memoryFileHarness(): FileStoreHarness {
  const store = new MemoryFileStore();
  let next = 1;
  return {
    store,
    missingJob: 987_654_321,
    async stage(content, chunkSize) {
      const id = next;
      next += 1;
      store.put(id, content, chunkSize);
      return id;
    },
    async stageIncomplete() {
      // Nothing is recorded about a file that was never completed.
      const id = next;
      next += 1;
      return id;
    },
    async damage(jobId, how) {
      store.damage(jobId, how);
    }
  };
}

/** `MemoryLookup` as a harness for the contract: `set` swaps the store. */
export function memoryLookupHarness(): LookupHarness {
  let current = new MemoryLookup();
  return {
    lookup: {
      categories: (keys) => current.categories(keys),
      reservedUrlKeys: () => current.reservedUrlKeys(),
      metafieldKeys: (entity) => current.metafieldKeys(entity)
    },
    async set(fixture) {
      current = new MemoryLookup(fixture);
    }
  };
}
