import fs from 'node:fs/promises';
import path from 'node:path';
import { REPO_ROOT } from './themeCli.js';

const THEMES_ROOT = path.join(REPO_ROOT, 'themes');

export interface ManifestLike {
  theme_name: string;
  version: string;
  widgets: Array<Record<string, unknown>>;
  placements: Array<Record<string, unknown>>;
}

/**
 * Create `themes/<themeId>/theme.json` for the duration of a test, then remove
 * the directory on cleanup. Pass `manifest = null` for a presentation-only
 * theme (no theme.json).
 */
export async function withTempThemeDir(
  themeId: string,
  manifest: ManifestLike | null
): Promise<{ dir: string; cleanup: () => Promise<void> }> {
  const dir = path.join(THEMES_ROOT, themeId);
  await fs.mkdir(dir, { recursive: true });
  if (manifest) {
    await fs.writeFile(
      path.join(dir, 'theme.json'),
      JSON.stringify(manifest, null, 2),
      'utf8'
    );
  }
  return {
    dir,
    cleanup: async () => {
      await fs.rm(dir, { recursive: true, force: true });
    }
  };
}

/** Overwrite an existing temp theme's theme.json (for upgrade tests). */
export async function writeManifest(
  themeId: string,
  manifest: ManifestLike
): Promise<void> {
  await fs.writeFile(
    path.join(THEMES_ROOT, themeId, 'theme.json'),
    JSON.stringify(manifest, null, 2),
    'utf8'
  );
}

export async function readThemeJson(themeId: string): Promise<ManifestLike> {
  const raw = await fs.readFile(
    path.join(THEMES_ROOT, themeId, 'theme.json'),
    'utf8'
  );
  return JSON.parse(raw) as ManifestLike;
}

/**
 * Hard-delete every trace of a theme's content + install state directly via
 * SQL — used by specs' afterEach so cleanup doesn't depend on the CLI path
 * under test. `db` is the e2e pool from `getDb()`.
 */
export async function purgeThemeContent(
  db: { query: (sql: string, params: unknown[]) => Promise<unknown> },
  themeId: string
): Promise<void> {
  await db.query(`DELETE FROM rollout_plan WHERE theme = $1`, [themeId]);
  await db.query(`DELETE FROM changeset WHERE theme = $1`, [themeId]);
  await db.query(`DELETE FROM widget_instance WHERE theme = $1`, [themeId]);
  await db.query(`DELETE FROM theme_install_state WHERE theme = $1`, [themeId]);
  await db.query(`DELETE FROM theme_install_log WHERE theme = $1`, [themeId]);
}
