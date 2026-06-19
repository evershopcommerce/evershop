import { expect, test } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { getDb } from '../../../shared/db.js';
import { runThemeCli } from '../../../shared/themeCli.js';
import {
  ManifestLike,
  purgeThemeContent,
  readThemeJson,
  withTempThemeDir
} from '../../../shared/themeFixture.js';

/** Phase 3 — `theme:export-content` (spec 04 § 6.4 / § 6.5). */
const cleanups: Array<() => Promise<void>> = [];
test.afterEach(async () => {
  for (const c of cleanups.splice(0)) await c();
});

function manifest(
  widgets: Array<Record<string, unknown>>,
  placements: Array<Record<string, unknown>>
): ManifestLike {
  return { theme_name: 'Boutique', version: '1.0.0', widgets, placements };
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

test.describe('theme:export-content', () => {
  test('export preserves widget/placement UUIDs and the new version', async () => {
    const id = `e2e-export-${randomUUID().slice(0, 8)}`;
    const w = randomUUID();
    const p = randomUUID();
    await provisionAndInstall(
      id,
      manifest(
        [{ uuid: w, type: 'text_block', name: 'Hero', settings: { text: 'x' } }],
        [{ uuid: p, widget_instance_uuid: w, route: 'all', area: 'content', sort_order: 10 }]
      )
    );

    const res = await runThemeCli([
      'theme:export-content',
      id,
      '--set-version',
      '2.5.0',
      '--force'
    ]);
    expect(res.exitCode, res.stdout + res.stderr).toBe(0);

    const exported = await readThemeJson(id);
    expect(exported.version).toBe('2.5.0');
    expect(exported.theme_name).toBe('Boutique'); // preserved
    expect(exported.widgets.map((x) => x.uuid)).toEqual([w]); // UUID stable
    expect(exported.placements.map((x) => x.uuid)).toEqual([p]);
  });

  test('export filters out disabled (status=false) widgets', async () => {
    const id = `e2e-exfilter-${randomUUID().slice(0, 8)}`;
    const wEnabled = randomUUID();
    const wDisabled = randomUUID();
    const p = randomUUID();
    await provisionAndInstall(
      id,
      manifest(
        [
          { uuid: wEnabled, type: 'text_block', name: 'Enabled', settings: {} },
          { uuid: wDisabled, type: 'text_block', name: 'Disabled', settings: {} }
        ],
        [{ uuid: p, widget_instance_uuid: wEnabled, route: 'all', area: 'content', sort_order: 10 }]
      )
    );

    // Merchant disables one widget in the page-builder.
    await getDb().query(
      `UPDATE widget_instance SET status = FALSE WHERE uuid = $1`,
      [wDisabled]
    );

    const res = await runThemeCli([
      'theme:export-content',
      id,
      '--set-version',
      '1.1.0',
      '--force'
    ]);
    expect(res.exitCode, res.stdout + res.stderr).toBe(0);

    const exported = await readThemeJson(id);
    const uuids = exported.widgets.map((x) => x.uuid);
    expect(uuids).toContain(wEnabled);
    expect(uuids).not.toContain(wDisabled); // disabled → excluded
  });

  test('a required, valid SemVer version is enforced', async () => {
    const id = `e2e-exver-${randomUUID().slice(0, 8)}`;
    const { cleanup } = await withTempThemeDir(id, null);
    cleanups.push(async () => {
      await purgeThemeContent(getDb(), id);
      await cleanup();
    });

    // Missing version → rejected.
    const missing = await runThemeCli(['theme:export-content', id, '--force']);
    expect(missing.exitCode).toBe(1);
    expect(missing.stdout + missing.stderr).toMatch(/version is required/i);

    // Invalid (non-SemVer) version → rejected.
    const invalid = await runThemeCli([
      'theme:export-content',
      id,
      '1.2',
      '--force'
    ]);
    expect(invalid.exitCode).toBe(1);
    expect(invalid.stdout + invalid.stderr).toMatch(/SemVer/i);
  });
});
