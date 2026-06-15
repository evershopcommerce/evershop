#!/usr/bin/env node
/* eslint-disable no-console */
import 'dotenv/config';
import kleur from 'kleur';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { pool } from '../../lib/postgres/connection.js';
import { confirmDestructive } from '../../lib/theme/prompts.js';
import { assertValidThemeId } from '../../lib/theme/themeId.js';
import { applyUninstall, previewUninstall } from '../../lib/theme/uninstall.js';

/**
 * `theme:uninstall <theme-id> [--yes]` (spec 04 § 6.3 / § 8). Drops all of a
 * theme's content (widgets, placements, drafts, rollouts) after a previewed,
 * confirmed prompt. Refuses non-interactively without `--yes`.
 */
const argv = yargs(hideBin(process.argv))
  .option('yes', { alias: 'y', type: 'boolean', default: false })
  .help()
  .parseSync();
const rawThemeId = argv._[1] != null ? String(argv._[1]) : undefined;

async function main(): Promise<void> {
  const themeId = assertValidThemeId(rawThemeId);
  const preview = await previewUninstall(themeId, pool);

  console.log(
    kleur.bold(`Uninstalling theme content for '${themeId}' will delete:`)
  );
  console.log(`  ${preview.widgets} widgets, ${preview.placements} placements`);
  console.log(
    `  ${preview.changesets} draft changeset(s), ${preview.rollouts} rollout plan(s)`
  );
  for (const d of preview.draftDetails) {
    console.log(kleur.dim(`    draft '${d.name}' (${d.opsCount} ops)`));
  }
  for (const r of preview.rolloutDetails) {
    console.log(kleur.dim(`    rollout '${r.name}'`));
  }

  if (
    preview.widgets === 0 &&
    preview.placements === 0 &&
    preview.changesets === 0 &&
    preview.rollouts === 0
  ) {
    console.log(kleur.green(`Nothing to uninstall for '${themeId}'.`));
    return;
  }

  const proceed = await confirmDestructive(
    `Continue with uninstall of '${themeId}'? This cannot be undone.`,
    { defaultYes: false, yesFlag: Boolean(argv.yes) }
  );
  if (!proceed) {
    console.log('Aborted.');
    return;
  }

  await applyUninstall(themeId, pool);
  console.log(kleur.green(`Uninstalled '${themeId}'.`));
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(kleur.red('theme:uninstall failed:'), (e as Error).message);
    process.exit(1);
  });
