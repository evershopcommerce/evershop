// The scratch store the harness (run.mjs) made for this run. Specs never
// point at a real store: everything comes from RELEASE_STORE_FILE.
import fs from 'node:fs';

export interface ReleaseStore {
  scenario: string;
  baseUrl: string;
  admin: { email: string; password: string };
  mailDir: string;
  serverLog: string;
  database: string;
  pg: { pgHost: string; pgPort: string; pgUser: string; pgPassword: string };
  candidateVersion: string;
  previousVersion?: string;
  legacyFile?: string;
}

let cached: ReleaseStore | null = null;

export function releaseStore(): ReleaseStore {
  if (cached) return cached;
  const file = process.env.RELEASE_STORE_FILE;
  if (!file || !fs.existsSync(file)) {
    throw new Error(
      'RELEASE_STORE_FILE is not set: run the release check through tests/e2e/release/run.mjs'
    );
  }
  cached = JSON.parse(fs.readFileSync(file, 'utf8')) as ReleaseStore;
  return cached;
}

export function outputDir(): string {
  return process.env.RELEASE_OUTPUT_DIR || 'release-output';
}

/** Per store, shared by every pass of a run (the admin session, set-up caches). */
export function stateDir(): string {
  return process.env.RELEASE_STATE_DIR || outputDir();
}

export const adminStateFile = (): string => `${stateDir()}/.auth/admin.json`;

/** A name no other run or test uses, for the records a spec creates. */
export function unique(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}${Math.random()
    .toString(36)
    .slice(2, 6)}`;
}
