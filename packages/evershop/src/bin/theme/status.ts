#!/usr/bin/env node
/* eslint-disable no-console */
import 'dotenv/config';
import path from 'path';
import kleur from 'kleur';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { pool } from '../../lib/postgres/connection.js';
import { dryRunDiff } from '../../lib/theme/install.js';
import { readManifest } from '../../lib/theme/manifest.js';
import { assertValidThemeId } from '../../lib/theme/themeId.js';
import { getActiveTheme } from '../../lib/util/getActiveTheme.js';

/**
 * `theme:status [<theme-id>]` (spec 04 § 6.2).
 *   - No arg: list every theme with installed content + the active marker.
 *   - With arg: dry-run diff of the theme's manifest vs its install snapshot.
 * CI-safe — no prompts, no writes.
 */
const argv = yargs(hideBin(process.argv)).help().parseSync();
const themeId = argv._[1] != null ? String(argv._[1]) : null;

function themeDir(id: string): string {
  return path.join(process.cwd(), 'themes', id);
}

async function listInstalled(): Promise<void> {
  const { rows } = await pool.query<{ theme: string; updated_at: Date }>(
    `SELECT theme, updated_at FROM theme_install_state ORDER BY theme`
  );
  if (rows.length === 0) {
    console.log('No themes have content installed.');
    return;
  }
  const active = getActiveTheme();
  console.log(kleur.bold('Installed theme content:'));
  for (const r of rows) {
    const marker = r.theme === active ? kleur.green('  (active)') : '';
    console.log(
      `  ${r.theme}   updated ${new Date(r.updated_at).toISOString()}${marker}`
    );
  }
}

async function showDetail(id: string): Promise<void> {
  assertValidThemeId(id);
  const state = await pool.query(
    `SELECT 1 FROM theme_install_state WHERE theme = $1`,
    [id]
  );
  if (state.rows.length === 0) {
    console.log(`Theme '${id}' has no content installed.`);
    return;
  }
  const manifest = await readManifest(themeDir(id));
  if (!manifest) {
    console.log(
      `Theme '${id}' is installed (snapshot only; theme.json missing on disk).`
    );
    return;
  }
  const diff = await dryRunDiff(id, manifest, pool);
  if (!diff) {
    console.log(`Theme '${id}' has no install state.`);
    return;
  }
  const c = diff.counts;
  const pending =
    diff.ops.length === 0
      ? kleur.green('up to date')
      : kleur.yellow(`${diff.ops.length} pending change(s)`);
  console.log(
    kleur.bold(`Theme '${id}' (version ${manifest.version}): `) + pending
  );
  console.log(`  Added:    ${c.widgets_added} widgets, ${c.placements_added} placements`);
  console.log(`  Updated:  ${c.widgets_updated} widgets, ${c.placements_updated} placements`);
  console.log(`  Removed:  ${c.widgets_removed} widgets, ${c.placements_removed} placements`);
  console.log(`  Conflicts: ${diff.conflicts.length}`);
}

(themeId ? showDetail(themeId) : listInstalled())
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(kleur.red('theme:status failed:'), (e as Error).message);
    process.exit(1);
  });
