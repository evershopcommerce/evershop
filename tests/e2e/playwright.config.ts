import { defineConfig, devices } from '@playwright/test';
import { config as loadEnv } from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Load .env (sibling of this config). Resolved manually so the suite works
// regardless of which cwd `npx playwright test` is invoked from.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadEnv({ path: path.join(__dirname, '.env') });

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const WORKERS = Number(process.env.PLAYWRIGHT_WORKERS ?? '1');

/**
 * EverShop end-to-end test config.
 *
 * Structure:
 *   - `globalSetup` provisions a throw-away admin user, logs them in via the
 *     real `/admin/user/login` endpoint, and saves the session cookie to
 *     `.auth/admin.json` (gitignored). Specs reuse that storage state so
 *     they don't pay the login cost per test.
 *   - `globalTeardown` deletes the admin user and any leftover `e2e-*`
 *     widget instances. Safe to re-run.
 *
 * Per-spec subdirectories under `pageBuilder/specs/`, `admin/specs/`, and
 * `storefront/specs/` are auto-discovered via the `testDir` glob.
 *
 * The suite assumes the dev server is running. We deliberately do NOT spin
 * up the server here — `npm run dev` is a heavyweight operation the user
 * controls. If `BASE_URL` is unreachable globalSetup fails fast.
 */
export default defineConfig({
  testDir: '.',
  testMatch: ['**/specs/**/*.spec.ts'],
  fullyParallel: false, // Shared DB — see comment in .env.example.
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: WORKERS,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }]
  ],
  globalSetup: path.join(__dirname, 'shared/globalSetup.ts'),
  globalTeardown: path.join(__dirname, 'shared/globalTeardown.ts'),
  outputDir: 'test-results',
  use: {
    baseURL: BASE_URL,
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    // Pre-authenticated state seeded by globalSetup. Each test starts
    // already logged in as the throw-away admin user.
    storageState: path.join(__dirname, '.auth/admin.json')
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ]
});
