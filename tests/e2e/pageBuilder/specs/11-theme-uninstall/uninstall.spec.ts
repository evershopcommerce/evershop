import { expect, test } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { getDb } from '../../../shared/db.js';
import { runThemeCli } from '../../../shared/themeCli.js';
import {
  ManifestLike,
  purgeThemeContent,
  withTempThemeDir
} from '../../../shared/themeFixture.js';

/** Phase 3 — `theme:uninstall` (spec 04 § 6.3 / § 8). */
const cleanups: Array<() => Promise<void>> = [];
test.afterEach(async () => {
  for (const c of cleanups.splice(0)) await c();
});

function oneWidgetManifest(w: string, p: string): ManifestLike {
  return {
    theme_name: 'E2E',
    version: '1.0.0',
    widgets: [{ uuid: w, type: 'text_block', name: 'W', settings: {} }],
    placements: [
      { uuid: p, widget_instance_uuid: w, route: 'all', area: 'content', sort_order: 10 }
    ]
  };
}
async function provisionAndInstall(themeId: string): Promise<{ w: string; p: string }> {
  const w = randomUUID();
  const p = randomUUID();
  const { cleanup } = await withTempThemeDir(themeId, oneWidgetManifest(w, p));
  cleanups.push(async () => {
    await purgeThemeContent(getDb(), themeId);
    await cleanup();
  });
  const res = await runThemeCli(['theme:active', themeId, '--content-only', '--yes']);
  expect(res.exitCode, res.stdout + res.stderr).toBe(0);
  return { w, p };
}

test.describe('theme:uninstall', () => {
  test('uninstall removes the theme content + install state', async () => {
    const id = `e2e-uninst-${randomUUID().slice(0, 8)}`;
    const { w } = await provisionAndInstall(id);

    const res = await runThemeCli(['theme:uninstall', id, '--yes']);
    expect(res.exitCode, res.stdout + res.stderr).toBe(0);
    expect(res.stdout).toMatch(/Uninstalled/);

    const db = getDb();
    expect(
      (await db.query(`SELECT 1 FROM widget_instance WHERE uuid = $1`, [w])).rows
    ).toHaveLength(0);
    expect(
      (await db.query(`SELECT 1 FROM theme_install_state WHERE theme = $1`, [id]))
        .rows
    ).toHaveLength(0);
  });

  test('uninstalling one theme leaves another theme untouched', async () => {
    const idA = `e2e-keepa-${randomUUID().slice(0, 8)}`;
    const idB = `e2e-dropb-${randomUUID().slice(0, 8)}`;
    const { w: wA } = await provisionAndInstall(idA);
    await provisionAndInstall(idB);

    const res = await runThemeCli(['theme:uninstall', idB, '--yes']);
    expect(res.exitCode).toBe(0);

    const db = getDb();
    // A survives intact.
    expect(
      (await db.query(`SELECT theme FROM widget_instance WHERE uuid = $1`, [wA]))
        .rows[0]?.theme
    ).toBe(idA);
    expect(
      (await db.query(`SELECT 1 FROM theme_install_state WHERE theme = $1`, [idA]))
        .rows
    ).toHaveLength(1);
  });

  test('uninstall without --yes refuses non-interactively', async () => {
    const id = `e2e-noyes-${randomUUID().slice(0, 8)}`;
    await provisionAndInstall(id);
    const res = await runThemeCli(['theme:uninstall', id]);
    expect(res.exitCode).toBe(1);
    expect(res.stdout + res.stderr).toMatch(/requires --yes/i);
    // Content still present (nothing deleted).
    expect(
      (await getDb().query(`SELECT 1 FROM theme_install_state WHERE theme = $1`, [id]))
        .rows
    ).toHaveLength(1);
  });
});
