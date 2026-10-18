import { getConfig } from '../../../lib/util/getConfig.js';

/**
 * `system.import.<key>` (§ 8.7), read as a plain path with a default. The typed
 * keys are declared in `getConfig.ts` when the module is registered. A value
 * that is not a positive number is the default.
 */
export function importSetting(key: string, fallback: number): number {
  const read = getConfig as unknown as (path: string, d?: unknown) => unknown;
  const value = Number(read(`system.import.${key}`, fallback));
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

/** A yes or no key, `false` unless it is set. */
export function importFlag(key: string): boolean {
  const read = getConfig as unknown as (path: string, d?: unknown) => unknown;
  return read(`system.import.${key}`, false) === true;
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
