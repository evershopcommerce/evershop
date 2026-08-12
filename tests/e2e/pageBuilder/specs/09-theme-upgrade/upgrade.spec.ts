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

/**
 * Phase 3 — three-way upgrade merge (spec 04 § 7.2) driven through the CLI.
 * The diff algorithm itself is unit-tested exhaustively; these prove the
 * CLI → DB integration: clean merges, conflicts (user wins), no-ops, and
 * user-deleted widgets staying deleted.
 */
const cleanups: Array<() => Promise<void>> = [];
test.afterEach(async () => {
  for (const c of cleanups.splice(0)) await c();
});

function widget(uuid: string, name: string, settings: Record<string, unknown> = {}) {
  return { uuid, type: 'text_block', name, settings };
}
function placement(uuid: string, w: string) {
  return { uuid, widget_instance_uuid: w, route: 'all', area: 'content', sort_order: 10 };
}
function manifest(
  version: string,
  widgets: Array<Record<string, unknown>>,
  placements: Array<Record<string, unknown>>
): ManifestLike {
  return { theme_name: 'E2E', version: version, widgets, placements };
}
async function provision(themeId: string, m: ManifestLike) {
  const { cleanup } = await withTempThemeDir(themeId, m);
  cleanups.push(async () => {
    await purgeThemeContent(getDb(), themeId);
    await cleanup();
  });
}
async function install(id: string) {
  const res = await runThemeCli(['theme:active', id, '--content-only', '--yes']);
  expect(res.exitCode, res.stdout + res.stderr).toBe(0);
  return res;
}

test.describe('theme:active / upgrade', () => {
  test('clean merge: author field applied, user customization on another field preserved', async () => {
    const id = `e2e-merge-${randomUUID().slice(0, 8)}`;
    const w = randomUUID();
    const p = randomUUID();
    await provision(
      id,
      manifest('1.0.0', [widget(w, 'V1', { text: 'a', heading: 'orig' })], [placement(p, w)])
    );
    await install(id);

    // User customizes `heading` in the page-builder.
    const db = getDb();
    await db.query(
      `UPDATE widget_instance SET settings = '{"text":"a","heading":"USER"}'::jsonb WHERE uuid = $1`,
      [w]
    );

    // Author renames the widget (V1 → V2) but leaves heading = orig.
    await writeManifest(
      id,
      manifest('2.0.0', [widget(w, 'V2', { text: 'a', heading: 'orig' })], [placement(p, w)])
    );
    const res = await install(id);
    expect(res.stdout).toMatch(/Upgraded/);

    const row = await db.query<{ name: string; heading: string }>(
      `SELECT name, settings->>'heading' AS heading FROM widget_instance WHERE uuid = $1`,
      [w]
    );
    expect(row.rows[0].name).toBe('V2'); // author change applied
    expect(row.rows[0].heading).toBe('USER'); // user customization preserved
  });

  test('conflict: author and user changed the same field → user wins, conflict logged', async () => {
    const id = `e2e-conflict-${randomUUID().slice(0, 8)}`;
    const w = randomUUID();
    const p = randomUUID();
    await provision(
      id,
      manifest('1.0.0', [widget(w, 'V1', { heading: 'orig' })], [placement(p, w)])
    );
    await install(id);

    const db = getDb();
    await db.query(
      `UPDATE widget_instance SET settings = '{"heading":"USER"}'::jsonb WHERE uuid = $1`,
      [w]
    );

    // Author also changes heading → conflict.
    await writeManifest(
      id,
      manifest('2.0.0', [widget(w, 'V1', { heading: 'AUTHOR' })], [placement(p, w)])
    );
    const res = await install(id);
    expect(res.stdout).toMatch(/Conflicts: 1/);

    const row = await db.query<{ heading: string }>(
      `SELECT settings->>'heading' AS heading FROM widget_instance WHERE uuid = $1`,
      [w]
    );
    expect(row.rows[0].heading).toBe('USER'); // user wins

    const log = await db.query<{ conflicts: number }>(
      `SELECT conflicts FROM theme_install_log
       WHERE theme = $1 AND command = 'upgrade' ORDER BY log_id DESC LIMIT 1`,
      [id]
    );
    expect(log.rows[0].conflicts).toBe(1);
  });

  test('re-running the same version with identical content is a no-op', async () => {
    const id = `e2e-noop-${randomUUID().slice(0, 8)}`;
    const w = randomUUID();
    const p = randomUUID();
    await provision(
      id,
      manifest('1.0.0', [widget(w, 'V1', { a: 1 })], [placement(p, w)])
    );
    await install(id);

    // Re-run, no change at all.
    const res = await install(id);
    expect(res.stdout).toMatch(/already up to date/);
    const log = await getDb().query(
      `SELECT 1 FROM theme_install_log WHERE theme = $1 AND command = 'upgrade'`,
      [id]
    );
    expect(log.rows).toHaveLength(0);
  });

  test('a higher version with identical content advances the recorded version', async () => {
    const id = `e2e-verbump-${randomUUID().slice(0, 8)}`;
    const w = randomUUID();
    const p = randomUUID();
    await provision(
      id,
      manifest('1.0.0', [widget(w, 'V1', { a: 1 })], [placement(p, w)])
    );
    await install(id);

    await writeManifest(
      id,
      manifest('2.0.0', [widget(w, 'V1', { a: 1 })], [placement(p, w)])
    );
    const res = await install(id);
    expect(res.stdout).toMatch(/Upgraded.*2\.0\.0/);

    // No content changes, but the recorded version advanced.
    const snap = await getDb().query<{ version: string }>(
      `SELECT snapshot->>'version' AS version FROM theme_install_state WHERE theme = $1`,
      [id]
    );
    expect(snap.rows[0].version).toBe('2.0.0');
  });

  test('a lower version is refused — no downgrade', async () => {
    const id = `e2e-downgrade-${randomUUID().slice(0, 8)}`;
    const w = randomUUID();
    const p = randomUUID();
    await provision(id, manifest('2.0.0', [widget(w, 'V2')], [placement(p, w)]));
    await install(id);

    // Author ships an OLDER version.
    await writeManifest(id, manifest('1.0.0', [widget(w, 'V1')], [placement(p, w)]));
    const res = await runThemeCli([
      'theme:active',
      id,
      '--content-only',
      '--yes'
    ]);
    expect(res.exitCode).toBe(1);
    expect(res.stdout + res.stderr).toMatch(/cannot downgrade/i);

    // Untouched — still the 2.0.0 widget name.
    const row = await getDb().query<{ name: string }>(
      `SELECT name FROM widget_instance WHERE uuid = $1`,
      [w]
    );
    expect(row.rows[0].name).toBe('V2');
  });

  test('content drift at the same version is a warned no-op (not applied)', async () => {
    const id = `e2e-drift-${randomUUID().slice(0, 8)}`;
    const w = randomUUID();
    const p = randomUUID();
    await provision(id, manifest('1.0.0', [widget(w, 'V1')], [placement(p, w)]));
    await install(id);

    // Author edits content but forgets to bump the version.
    await writeManifest(id, manifest('1.0.0', [widget(w, 'V2')], [placement(p, w)]));
    const res = await install(id);
    expect(res.stdout + res.stderr).toMatch(/unchanged|bump the version/i);

    // Content NOT applied — still V1.
    const row = await getDb().query<{ name: string }>(
      `SELECT name FROM widget_instance WHERE uuid = $1`,
      [w]
    );
    expect(row.rows[0].name).toBe('V1');
  });

  test('an invalid (non-SemVer) version is rejected at validation', async () => {
    const id = `e2e-badver-${randomUUID().slice(0, 8)}`;
    const w = randomUUID();
    const p = randomUUID();
    await provision(id, manifest('1.2', [widget(w, 'V1')], [placement(p, w)]));
    const res = await runThemeCli([
      'theme:active',
      id,
      '--content-only',
      '--yes'
    ]);
    expect(res.exitCode).toBe(1);
    expect(res.stdout + res.stderr).toMatch(/SemVer|version must be/i);
  });

  test('a widget the user deleted is not re-added on upgrade', async () => {
    const id = `e2e-userdel-${randomUUID().slice(0, 8)}`;
    const w = randomUUID();
    const p = randomUUID();
    await provision(id, manifest('1.0.0', [widget(w, 'V1')], [placement(p, w)]));
    await install(id);

    // User deletes the widget (cascades its placement).
    const db = getDb();
    await db.query(`DELETE FROM widget_instance WHERE uuid = $1`, [w]);

    // Author still ships it in v2 — must NOT come back.
    await writeManifest(id, manifest('2.0.0', [widget(w, 'V1 changed')], [placement(p, w)]));
    await install(id);

    const row = await db.query(`SELECT 1 FROM widget_instance WHERE uuid = $1`, [w]);
    expect(row.rows).toHaveLength(0);
  });
});
