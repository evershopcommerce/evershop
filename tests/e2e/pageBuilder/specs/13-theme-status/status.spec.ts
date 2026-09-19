import { expect, test } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { getDb } from '../../../shared/db.js';
import { runThemeCli } from '../../../shared/themeCli.js';
import {
  ManifestLike,
  purgeThemeContent,
  withTempThemeDir,
  writeManifest
} from '../../../shared/themeFixture.js';

/** Phase 3 — `theme:status` (spec 04 § 6.2). */
const cleanups: Array<() => Promise<void>> = [];
test.afterEach(async () => {
  for (const c of cleanups.splice(0)) await c();
});

function manifest(version: string, name: string): ManifestLike {
  const w = randomUUID();
  const p = randomUUID();
  return {
    theme_name: 'E2E',
    version: version,
    widgets: [{ uuid: w, type: 'text_block', name, settings: {} }],
    placements: [
      { uuid: p, widget_instance_uuid: w, route: 'all', area: 'content', sort_order: 10 }
    ]
  };
}
async function provisionAndInstall(themeId: string, m: ManifestLike) {
  const { cleanup } = await withTempThemeDir(themeId, m);
  cleanups.push(async () => {
    await purgeThemeContent(getDb(), themeId);
    await cleanup();
  });
  const res = await runThemeCli(['theme:active', themeId, '--content-only', '--yes']);
  expect(res.exitCode, res.stdout + res.stderr).toBe(0);
}

test.describe('theme:status', () => {
  test('no-arg lists themes with installed content', async () => {
    const id = `e2e-status-${randomUUID().slice(0, 8)}`;
    await provisionAndInstall(id, manifest('1.0.0', 'S'));

    const res = await runThemeCli(['theme:status']);
    expect(res.exitCode, res.stdout + res.stderr).toBe(0);
    expect(res.stdout).toContain(id);
  });

  test('with-arg reports pending changes after the manifest drifts from the snapshot', async () => {
    const id = `e2e-statusd-${randomUUID().slice(0, 8)}`;
    // Build the base manifest ONCE so its uuids are stable across install +
    // the drifted version below (the drift is purely the one added widget).
    const base = manifest('1.0.0', 'S');
    await provisionAndInstall(id, base);

    // Up to date right after install.
    let res = await runThemeCli(['theme:status', id]);
    expect(res.exitCode).toBe(0);
    expect(res.stdout).toMatch(/up to date/i);

    // Same content + one extra widget (not yet installed) → exactly 1 pending add.
    const drifted: ManifestLike = {
      ...base,
      version: '2.0.0',
      widgets: [
        ...base.widgets,
        { uuid: randomUUID(), type: 'text_block', name: 'Extra', settings: {} }
      ]
    };
    await writeManifest(id, drifted);

    res = await runThemeCli(['theme:status', id]);
    expect(res.exitCode).toBe(0);
    expect(res.stdout).toMatch(/pending change/i);
    expect(res.stdout).toMatch(/Added:\s*1 widgets/);
  });
});
