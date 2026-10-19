import { getConfig } from '../../../lib/util/getConfig.js';

/** The keys of `system.import.*` that are numbers (typed in `getConfig.ts`). */
export type ImportNumberKey =
  | 'maxFileSizeMb'
  | 'maxRows'
  | 'maxCellLength'
  | 'maxIssues'
  | 'retentionDays'
  | 'imageTimeoutSeconds'
  | 'maxWorkersPerInstance'
  | 'workerMemoryMb';

/** The keys of `system.import.*` that are yes or no. */
export type ImportFlagKey = 'allowPrivateNetworks';

/**
 * `system.import.<key>` (§ 8.7) with a default. A value that is not a positive
 * number is the default.
 */
export function importSetting(key: ImportNumberKey, fallback: number): number {
  const value = Number(getConfig(`system.import.${key}`, fallback));
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

/** A yes or no key, `false` unless it is set. */
export function importFlag(key: ImportFlagKey): boolean {
  return getConfig(`system.import.${key}`, false) === true;
}

/** How long a finished job is kept: `retentionDays`, 7 by default. */
export function retentionMs(): number {
  return importSetting('retentionDays', 7) * 86_400_000;
}

/** The most bytes an upload may have: `maxFileSizeMb`, 100 by default. */
export function maxFileBytes(): number {
  return Math.floor(importSetting('maxFileSizeMb', 100) * 1_048_576);
}

/** The limits the engine checks a file with. */
export function fileLimits() {
  return {
    maxRows: importSetting('maxRows', 200_000),
    maxCellLength: importSetting('maxCellLength', 65_536),
    maxIssues: importSetting('maxIssues', 100_000)
  };
}

/** The most workers one instance runs at a time: `maxWorkersPerInstance`, 2 by default. */
export function maxWorkersPerInstance(): number {
  return Math.floor(importSetting('maxWorkersPerInstance', 2));
}

/** The memory ceiling of a worker, in MB: `workerMemoryMb`, 1,024 by default. */
export function workerMemoryMb(): number {
  return Math.floor(importSetting('workerMemoryMb', 1024));
}
