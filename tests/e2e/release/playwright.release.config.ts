// Playwright config of the release check. Run it through run.mjs, which
// makes the scratch store and sets RELEASE_STORE_FILE / RELEASE_OUTPUT_DIR.
import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';
import { outputDir, releaseStore } from './support/store';

const out = outputDir();

export default defineConfig({
  testDir: './specs',
  fullyParallel: false,
  workers: 1,
  // A release check must not hide a flaky test behind a retry.
  retries: 0,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: path.join(out, 'html') }],
    ['json', { outputFile: path.join(out, 'results.json') }]
  ],
  outputDir: path.join(out, 'test-results'),
  use: {
    baseURL: releaseStore().baseUrl,
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  projects: [
    {
      name: 'setup',
      testMatch: /admin\.setup\.ts$/,
      use: { ...devices['Desktop Chrome'] }
    },
    // Upgrade checks: run by the harness only on an upgraded store, before
    // the main suite (`--project setup --project upgrade`).
    {
      name: 'upgrade',
      testMatch: /upgrade\.check\.ts$/,
      dependencies: ['setup'],
      use: { ...devices['Desktop Chrome'] }
    },
    // run.mjs runs each spec file in its own pass after restarting the store,
    // so every file has the store's rate limits (8 logins per 15 minutes,
    // 120 API calls per minute, per IP, in the store's memory) to itself.
    {
      name: 'release',
      testMatch: /\.spec\.ts$/,
      dependencies: ['setup'],
      use: { ...devices['Desktop Chrome'] }
    }
  ]
});
