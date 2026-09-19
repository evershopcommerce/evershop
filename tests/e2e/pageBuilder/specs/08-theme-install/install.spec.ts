import { expect, test } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { getDb } from '../../../shared/db.js';
import { runThemeCli } from '../../../shared/themeCli.js';
import {
  ManifestLike,
  purgeThemeContent,
  withTempThemeDir
} from '../../../shared/themeFixture.js';

/**
 * Phase 3 — `theme:active` install pipeline (spec 04 § 5, § 7.1). Each test
 * drops a temp theme dir, runs the compiled CLI as a child process, and
 * asserts the DB result. Cleanup hard-deletes the theme's content + state.
 */
const cleanups: Array<() => Promise<void>> = [];
test.afterEach(async () => {
  for (const c of cleanups.splice(0)) await c();
});

function widget(uuid: string, name: string, settings: Record<string, unknown> = {}) {
  return { uuid, type: 'text_block', name, settings };
}
function placement(uuid: string, w: string, sort = 10) {
  return { uuid, widget_instance_uuid: w, route: 'all', area: 'content', sort_order: sort };
}
function manifest(
  version: string,
  widgets: Array<Record<string, unknown>>,
  placements: Array<Record<string, unknown>>
): ManifestLike {
  return { theme_name: 'E2E', version: version, widgets, placements };
}
async function provision(themeId: string, m: ManifestLike | null) {
  const { cleanup } = await withTempThemeDir(themeId, m);
  cleanups.push(async () => {
    await purgeThemeContent(getDb(), themeId);
    await cleanup();
  });
}

test.describe('theme:active / install', () => {
  test('fresh install creates widgets + placements tagged with the theme', async () => {
    const id = `e2e-install-${randomUUID().slice(0, 8)}`;
    const w = randomUUID();
    const p = randomUUID();
    await provision(id, manifest('1.0.0', [widget(w, 'Hello', { text: 'hi' })], [placement(p, w)]));

    const res = await runThemeCli(['theme:active', id, '--content-only', '--yes']);
    expect(res.exitCode, res.stdout + res.stderr).toBe(0);
    expect(res.stdout).toMatch(/Installed/);

    const db = getDb();
    const wi = await db.query<{ name: string; theme: string; status: boolean; text: string }>(
      `SELECT name, theme, status, settings->>'text' AS text
       FROM widget_instance WHERE uuid = $1`,
      [w]
    );
    expect(wi.rows).toHaveLength(1);
    expect(wi.rows[0].theme).toBe(id);
    expect(wi.rows[0].status).toBe(true); // spec § 7.2.2 — installed widgets enabled
    expect(wi.rows[0].text).toBe('hi');

    const pl = await db.query<{ theme: string }>(
      `SELECT theme FROM widget_placement WHERE uuid = $1`,
      [p]
    );
    expect(pl.rows[0].theme).toBe(id);

    // Install state snapshot written.
    const st = await db.query(
      `SELECT 1 FROM theme_install_state WHERE theme = $1`,
      [id]
    );
    expect(st.rows).toHaveLength(1);
  });

  test('an invalid widget uuid fails validation and installs nothing', async () => {
    const id = `e2e-badid-${randomUUID().slice(0, 8)}`;
    const p = randomUUID();
    await provision(
      id,
      manifest('1.0.0', [widget('not-a-uuid', 'X')], [placement(p, 'not-a-uuid')])
    );

    const res = await runThemeCli(['theme:active', id, '--content-only', '--yes']);
    expect(res.exitCode).toBe(1);
    expect(res.stdout + res.stderr).toMatch(/UUID v4|validation/i);

    const st = await getDb().query(
      `SELECT 1 FROM theme_install_state WHERE theme = $1`,
      [id]
    );
    expect(st.rows).toHaveLength(0);
  });

  test('--dry-run reports the plan without writing anything', async () => {
    const id = `e2e-dry-${randomUUID().slice(0, 8)}`;
    const w = randomUUID();
    const p = randomUUID();
    await provision(id, manifest('1.0.0', [widget(w, 'D')], [placement(p, w)]));

    const res = await runThemeCli(['theme:active', id, '--dry-run']);
    expect(res.exitCode, res.stdout + res.stderr).toBe(0);
    expect(res.stdout).toMatch(/Dry run/);

    const wi = await getDb().query(
      `SELECT 1 FROM widget_instance WHERE uuid = $1`,
      [w]
    );
    expect(wi.rows).toHaveLength(0); // nothing applied
  });

  test('installing a uuid already owned by another theme is rejected (DB collision)', async () => {
    const db = getDb();
    const w = randomUUID();
    // Pre-existing widget owned by 'other-theme'.
    await db.query(
      `INSERT INTO widget_instance (uuid, name, type, settings, status, theme)
       VALUES ($1, 'e2e-owned', 'text_block', '{}'::jsonb, TRUE, 'e2e-other-owner')`,
      [w]
    );
    cleanups.push(async () => {
      await db.query(`DELETE FROM widget_instance WHERE uuid = $1`, [w]);
    });

    const id = `e2e-collide-${randomUUID().slice(0, 8)}`;
    const p = randomUUID();
    await provision(id, manifest('1.0.0', [widget(w, 'Mine')], [placement(p, w)]));

    const res = await runThemeCli(['theme:active', id, '--content-only', '--yes']);
    expect(res.exitCode).toBe(1);
    expect(res.stdout + res.stderr).toMatch(/already exists under theme/i);
  });
});
