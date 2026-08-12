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

interface ProvisionRow {
  theme: string;
  c: number;
}

/** Per-theme counts of theme-provisioned definitions (derived from the
 *  provisioned_by_theme attribution column); [] on unmigrated DBs. */
async function loadProvisionSummary(): Promise<ProvisionRow[]> {
  try {
    const { rows } = await pool.query<ProvisionRow>(
      `SELECT provisioned_by_theme AS theme, COUNT(*)::int AS c
         FROM metafield_definition
        WHERE provisioned_by_theme IS NOT NULL
        GROUP BY provisioned_by_theme
        ORDER BY provisioned_by_theme`
    );
    return rows;
  } catch {
    return []; // column absent (42703) — DB not migrated yet
  }
}

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

  // Attribution survives uninstall (it lives on the definition rows, which
  // are left in place), so report per theme — definitions from a theme that
  // isn't active anymore are orphans the merchant may want to clean up.
  const provisions = await loadProvisionSummary();
  if (provisions.length > 0) {
    console.log(kleur.bold('Theme-provisioned metafield definitions:'));
    for (const p of provisions) {
      const orphan =
        p.theme !== active
          ? kleur.yellow('  (orphaned — theme not active)')
          : '';
      console.log(`  ${p.theme}   ${p.c}${orphan}`);
    }
  }
}

async function printThemeProvisions(id: string): Promise<void> {
  let rows: Array<{ owner_type: string; namespace: string; field_key: string }>;
  try {
    rows = (
      await pool.query<{
        owner_type: string;
        namespace: string;
        field_key: string;
      }>(
        `SELECT owner_type, namespace, field_key
           FROM metafield_definition
          WHERE provisioned_by_theme = $1
          ORDER BY owner_type, namespace, field_key`,
        [id]
      )
    ).rows;
  } catch {
    return; // attribution column absent — DB not migrated yet
  }
  if (rows.length === 0) return;
  console.log(
    kleur.bold(`  Provisioned metafield definitions (${rows.length}):`)
  );
  for (const r of rows) {
    console.log(`    ${r.owner_type}.${r.namespace}.${r.field_key}`);
  }
}

async function showDetail(id: string): Promise<void> {
  assertValidThemeId(id);
  const state = await pool.query(
    `SELECT 1 FROM theme_install_state WHERE theme = $1`,
    [id]
  );
  if (state.rows.length === 0) {
    // Provisions survive uninstall — report them even without install state.
    console.log(`Theme '${id}' has no content installed.`);
    await printThemeProvisions(id);
    return;
  }
  const manifest = await readManifest(themeDir(id));
  if (!manifest) {
    console.log(
      `Theme '${id}' is installed (snapshot only; theme.json missing on disk).`
    );
    await printThemeProvisions(id);
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
  console.log(
    `  Added:    ${c.widgets_added} widgets, ${c.placements_added} placements`
  );
  console.log(
    `  Updated:  ${c.widgets_updated} widgets, ${c.placements_updated} placements`
  );
  console.log(
    `  Removed:  ${c.widgets_removed} widgets, ${c.placements_removed} placements`
  );
  console.log(`  Conflicts: ${diff.conflicts.length}`);
  await printThemeProvisions(id);
}

(themeId ? showDetail(themeId) : listInstalled())
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(kleur.red('theme:status failed:'), (e as Error).message);
    process.exit(1);
  });
