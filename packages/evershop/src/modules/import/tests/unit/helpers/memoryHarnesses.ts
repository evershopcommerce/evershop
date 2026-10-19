import { RETENTION_MS } from '../../../services/job/transitions.js';
import { FakeClock } from '../../../testing/FakeClock.js';
import { MemoryFileStore } from '../../../testing/MemoryFileStore.js';
import { MemoryJobStore } from '../../../testing/MemoryJobStore.js';
import { MemoryLookup } from '../../../testing/MemoryLookup.js';
import { MemoryServices } from '../../../testing/MemoryServices.js';
import type { ServicesHarness } from './entityServicesContract.js';
import type { FileStoreHarness } from './fileStoreContract.js';
import type { JobAdminHarness } from './jobAdminContract.js';
import type { JobMaintenanceHarness } from './jobMaintenanceContract.js';
import type { LookupHarness } from './lookupContract.js';

/**
 * The in-memory jobs, with a fake clock, as a harness for the contracts of the
 * worker's side (`JobRepository`) and of the API's (`JobAdmin`).
 */
export function memoryJobHarness(): JobMaintenanceHarness & {
  repo: MemoryJobStore;
  clock: FakeClock;
} {
  const clock = new FakeClock();
  const repo = new MemoryJobStore(clock);
  return {
    repo,
    admin: repo,
    maintenance: repo,
    clock,
    async chunksOf(jobId) {
      return repo.chunksOf(jobId);
    },
    async seedChunks(jobId, chunks) {
      repo.seedChunks(jobId, chunks);
    },
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
      metafieldKeys: (entity) => current.metafieldKeys(entity),
      products: (skus) => current.products(skus),
      productUrlKeyOwners: (keys) => current.productUrlKeyOwners(keys),
      attributeGroups: (names) => current.attributeGroups(names),
      packages: (names) => current.packages(names),
      taxClasses: (names) => current.taxClasses(names),
      defaultPackage: () => current.defaultPackage(),
      attributes: (codes) => current.attributes(codes),
      attributeGroupLinks: (id) => current.attributeGroupLinks(id),
      attributeOptions: (id, texts) => current.attributeOptions(id, texts),
      variantGroups: (ids) => current.variantGroups(ids),
      redirects: (paths) => current.redirects(paths),
      rewritePaths: (paths) => current.rewritePaths(paths)
    },
    async set(fixture) {
      current = new MemoryLookup(fixture);
    }
  };
}

/** `MemoryServices` over a `MemoryLookup`, as a harness for the contract of EntityServices. */
export function memoryServicesHarness(): ServicesHarness {
  const lookup = new MemoryLookup();
  const services = new MemoryServices(lookup);
  return {
    services,
    async find(urlKey) {
      const found = lookup.stored.get(urlKey);
      return found
        ? {
            id: found.id,
            uuid: found.uuid,
            name: found.name,
            status: found.status,
            parentUrlKey: found.parentUrlKey
          }
        : null;
    },
    async count() {
      return lookup.stored.size;
    }
  };
}
