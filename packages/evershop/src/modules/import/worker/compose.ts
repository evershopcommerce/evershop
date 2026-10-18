import type { Pool } from 'pg';
import type { LookupFunction } from '../../../lib/ssrf/guardedLookup.js';
import { createHttpImageFetcher } from '../adapters/HttpImageFetcher.js';
import type { StoredFile } from '../adapters/HttpImageFetcher.js';
import { nodeSha256Hex } from '../adapters/nodeSha256.js';
import { PgFileStore } from '../adapters/PgFileStore.js';
import { PgJobAdmin } from '../adapters/PgJobAdmin.js';
import { PgJobRepository } from '../adapters/PgJobRepository.js';
import { PgLookup } from '../adapters/PgLookup.js';
import { systemClock } from '../adapters/systemClock.js';
import type { ImportDeps } from '../services/deps.js';
import type { JobAdmin } from '../services/ports/jobAdmin.js';
import type { Logger } from '../services/ports/logger.js';
import type { EntityServices } from '../services/ports/services.js';

/**
 * What the worker needs from the rest of EverShop, as plain functions: the pool,
 * the real services, the storefront routes and languages, the file storage and
 * the settings. `corePorts.ts` makes them from core; a test passes its own, so
 * the wiring below is tested on a real database without booting the store.
 */
export interface CorePorts {
  pool: Pool;
  services: EntityServices;
  /** The storefront routes without the admin and API ones, as paths. */
  routePaths(): readonly string[];
  enabledLanguages(): Promise<readonly string[]>;
  /** Writes an image to the store's file storage (`uploadFile`). */
  storeImage(file: StoredFile): Promise<{ url: string }>;
  /** The addresses of the store's own file storage (IMG-06). */
  ownStorage(): readonly string[];
  allowedImageTypes(): readonly string[];
  maxImageBytesForType(contentType: string): number;
  sanitizeFileName(name: string): string;
  logger: Logger;
  limits: { maxRows: number; maxCellLength: number; maxIssues: number };
  imageTimeoutMs: number;
  /** A test switch: private addresses are refused unless it is on (§ 4.5, point 9). */
  allowPrivateNetworks(): boolean;
  retentionMs: number;
  /** A test passes a fake DNS. */
  dnsLookup?: LookupFunction;
}

export interface Composed {
  deps: ImportDeps;
  admin: JobAdmin;
  /** Ends what the deps hold open (the image downloader). */
  close(): Promise<void>;
}

/**
 * The composition root of the worker (§ 4.5, point 7): builds the one
 * `ImportDeps` that the runner takes, from the real adapters. It is the only
 * place where the ports meet their implementations.
 */
export function composeWorker(core: CorePorts): Composed {
  const images = createHttpImageFetcher({
    keyDeps: {
      sha256Hex: nodeSha256Hex,
      sanitizeFileName: core.sanitizeFileName
    },
    store: core.storeImage,
    ownStorage: core.ownStorage,
    allowPrivate: core.allowPrivateNetworks,
    lookup: core.dnsLookup,
    timeoutMs: core.imageTimeoutMs,
    allowedTypes: core.allowedImageTypes,
    maxBytesForType: core.maxImageBytesForType
  });
  return {
    deps: {
      files: new PgFileStore(core.pool),
      jobs: new PgJobRepository(core.pool, { retentionMs: core.retentionMs }),
      lookup: new PgLookup(core.pool, {
        routePaths: core.routePaths,
        enabledLanguages: core.enabledLanguages
      }),
      services: core.services,
      images,
      clock: systemClock,
      config: core.limits,
      logger: core.logger,
      sha256Hex: nodeSha256Hex
    },
    admin: new PgJobAdmin(core.pool, { retentionMs: core.retentionMs }),
    close: () => images.close()
  };
}
