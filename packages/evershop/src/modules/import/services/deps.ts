import type { ImageFetcher } from './images/types.js';
import type { Clock } from './ports/clock.js';
import type { FileStore } from './ports/fileStore.js';
import type { JobRepository } from './ports/jobRepository.js';
import type { Logger } from './ports/logger.js';
import type { Lookup } from './ports/lookup.js';
import type { EntityServices } from './ports/services.js';

/** The limits the engine reads from the configuration (§ 8.7). */
export interface ImportConfig {
  /** Data rows in a file (ALL-03). */
  maxRows: number;
  /** Characters in a cell (ALL-12). */
  maxCellLength: number;
  /** Problems stored for a job and a phase; more are counted, not kept. */
  maxIssues: number;
}

/**
 * Everything the runner needs from the outside world, in one object (§ 4.5,
 * point 1). The composition root (`worker/main.ts`) builds the real one in one
 * place; a test builds one from the doubles in `testing/`.
 */
export interface ImportDeps {
  files: FileStore;
  jobs: JobRepository;
  lookup: Lookup;
  services: EntityServices;
  images: ImageFetcher;
  clock: Clock;
  config: ImportConfig;
  logger: Logger;
  /** SHA-256 of a text as hexadecimal digits. */
  sha256Hex: (text: string) => string;
}

/** The import stops after this many failed rows (D-14). A constant, not a setting. */
export const MAX_FAILED_ROWS = 10;

/** The worker writes its counts and problems, and proves it is alive, this often. */
export const HEARTBEAT_MS = 2000;
