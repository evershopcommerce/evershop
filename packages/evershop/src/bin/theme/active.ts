#!/usr/bin/env node
/* eslint-disable no-console */

import 'dotenv/config';
import { exec } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import boxen from 'boxen';
import enquirer from 'enquirer';
import kleur from 'kleur';
import ora from 'ora';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { pool } from '../../lib/postgres/connection.js';
import { dryRunDiff, installOrUpgrade } from '../../lib/theme/install.js';
import {
  readManifest,
  validateManifest,
  warnUnknownTypes,
  type Manifest,
  type ValidationError
} from '../../lib/theme/manifest.js';
import { assertValidThemeId } from '../../lib/theme/themeId.js';

const { prompt } = enquirer;
const argv = yargs(hideBin(process.argv))
  .option('dry-run', { type: 'boolean', default: false })
  .option('content-only', {
    type: 'boolean',
    default: false,
    description: 'Install the theme content but do not change the active theme'
  })
  .option('yes', {
    alias: 'y',
    type: 'boolean',
    default: false,
    description: 'Skip the post-activation build prompt'
  })
  .help()
  .parseSync();

function themeDir(id: string): string {
  return path.join(process.cwd(), 'themes', id);
}

async function selectTheme(): Promise<string> {
  const themesDir = path.join(process.cwd(), 'themes');
  let themeNames: string[] = [];
  try {
    const files = await fs.readdir(themesDir, { withFileTypes: true });
    themeNames = files
      .filter((dirent) => dirent.isDirectory())
      .map((dirent) => dirent.name);
    if (themeNames.length === 0) {
      console.error(kleur.red('No themes found in themes directory.'));
      process.exit(1);
    }
  } catch (err) {
    console.error(kleur.red('Error reading themes directory:'), err);
    process.exit(1);
  }
  const response: any = await prompt({
    type: 'select',
    name: 'theme',
    message: 'Select a theme to activate:',
    choices: themeNames
  });
  return response.theme;
}

async function updateConfig(theme: string) {
  const configDir = path.join(process.cwd(), 'config');
  const configPath = path.join(configDir, 'default.json');
  try {
    try {
      await fs.access(configDir);
    } catch {
      await fs.mkdir(configDir, { recursive: true });
    }

    let config: any = {};
    try {
      const configData = await fs.readFile(configPath, 'utf8');
      config = JSON.parse(configData);
    } catch (err: any) {
      if (err.code !== 'ENOENT') {
        throw err;
      }
    }

    config.system = config.system || {};
    config.system.theme = theme;
    await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf8');

    console.log(
      boxen(kleur.green(`Theme updated to "${theme}" in config/default.json`), {
        padding: 1,
        borderColor: 'green'
      })
    );
  } catch (err) {
    console.error(kleur.red('Error updating config:'), err);
    process.exit(1);
  }
}

async function runBuild() {
  const spinner = ora('Running build...').start();
  return new Promise<void>((resolve, reject) => {
    exec('npm run build', (error, stdout, stderr) => {
      if (error) {
        spinner.fail('Build failed');
        console.error(stderr);
        return reject(error);
      }
      spinner.succeed('Build completed successfully');
      console.log(stdout);
      return resolve();
    });
  });
}

async function confirmBuild() {
  // Non-interactive (CI / piped) or `--yes`: never block on a prompt.
  if (argv.yes || !process.stdin.isTTY) return false;
  const response: any = await prompt({
    type: 'confirm',
    name: 'runBuild',
    initial: true,
    message: 'Would you like to run "npm run build" now?'
  });
  return response.runBuild;
}

function printValidationErrors(errors: ValidationError[]): void {
  console.error(kleur.red(`theme.json failed validation (${errors.length}):`));
  for (const e of errors) {
    const where =
      e.index !== undefined ? `${e.scope}[${e.index}]` : e.scope;
    console.error(kleur.red(`  - ${where}: ${e.message}`));
  }
}

function printCounts(counts: {
  widgets_added: number;
  widgets_updated: number;
  widgets_removed: number;
  placements_added: number;
  placements_updated: number;
  placements_removed: number;
}): void {
  console.log(
    `  Added:    ${counts.widgets_added} widgets, ${counts.placements_added} placements`
  );
  console.log(
    `  Updated:  ${counts.widgets_updated} widgets, ${counts.placements_updated} placements`
  );
  console.log(
    `  Removed:  ${counts.widgets_removed} widgets, ${counts.placements_removed} placements`
  );
}

/**
 * Run the manifest install pipeline (validate → soft-warn → dry-run|apply).
 * Returns false to abort activation (validation failure), true to proceed.
 */
async function runInstallPipeline(
  themeId: string,
  manifest: Manifest
): Promise<boolean> {
  const errors = await validateManifest(manifest, { themeId, pool });
  if (errors.length > 0) {
    printValidationErrors(errors);
    return false;
  }

  // Soft warning for never-before-seen widget types (non-blocking).
  const known = new Set(
    (await pool.query<{ type: string }>(`SELECT DISTINCT type FROM widget_instance`)).rows.map(
      (r) => r.type
    )
  );
  warnUnknownTypes(manifest, known, (m) => console.warn(kleur.yellow(m)));

  if (argv['dry-run']) {
    const diff = await dryRunDiff(themeId, manifest, pool);
    if (!diff) {
      console.log(
        kleur.bold(
          `Dry run — '${themeId}' is not yet installed; activation would do a ` +
            `fresh install of ${manifest.widgets.length} widgets, ` +
            `${manifest.placements.length} placements.`
        )
      );
    } else {
      console.log(kleur.bold(`Dry run — pending changes for '${themeId}':`));
      printCounts(diff.counts);
      console.log(`  Conflicts: ${diff.conflicts.length}`);
    }
    return false; // dry run never proceeds to config write
  }

  const result = await installOrUpgrade({ themeId, manifest, pool });
  if (result.command === 'rejected') {
    console.error(
      kleur.red(`Refusing to activate '${themeId}': ${result.rejectedReason}`)
    );
    return false;
  }
  if (result.command === 'no-op') {
    console.log(kleur.green(`'${themeId}' content already up to date.`));
    if (result.contentDriftAtSameVersion) {
      console.warn(
        kleur.yellow(
          `  Note: theme.json content differs from what's installed, but ` +
            `version ${manifest.version} is unchanged — bump the version to ` +
            `apply the changes.`
        )
      );
    }
  } else {
    console.log(
      kleur.green(
        `${result.command === 'install' ? 'Installed' : 'Upgraded'} ` +
          `'${themeId}' (version ${manifest.version}).`
      )
    );
    printCounts(result.counts);
    if (
      result.adopted &&
      (result.adopted.widgets > 0 || result.adopted.placements > 0)
    ) {
      console.log(
        kleur.dim(
          `  Adopted:  ${result.adopted.widgets} widgets, ${result.adopted.placements} placements ` +
            `already in the DB (left unchanged — recorded as the install baseline).`
        )
      );
    }
    if (result.conflicts.length > 0) {
      console.log(
        kleur.yellow(
          `  Conflicts: ${result.conflicts.length} (your customizations preserved):`
        )
      );
      for (const c of result.conflicts) {
        console.log(
          kleur.yellow(
            `    widget ${c.widget_uuid} field ${c.field_path}: ` +
              `manifest=${JSON.stringify(c.manifest_value)} kept=${JSON.stringify(
                c.user_value
              )}`
          )
        );
      }
    }
  }
  return true;
}

async function activateTheme() {
  const themeId = assertValidThemeId(
    argv._[1] != null ? String(argv._[1]) : await selectTheme()
  );

  // The theme directory must exist before we touch anything. A non-existent
  // id (a typo, or a flag like `--content-only` mis-parsed as the id when args
  // aren't passed after `--`) must NEVER reach `updateConfig` — writing a
  // bogus `config.system.theme` breaks the server on its next start.
  try {
    await fs.access(themeDir(themeId));
  } catch {
    console.error(
      kleur.red(
        `Theme '${themeId}' not found — there is no directory at ${themeDir(
          themeId
        )}. Check the name (and, with npm, pass args after \`--\`: ` +
          `\`npm run theme:active -- ${themeId} --content-only\`).`
      )
    );
    process.exit(1);
  }

  const manifest = await readManifest(themeDir(themeId));
  if (manifest === null) {
    console.log(
      kleur.dim(
        `No theme.json for '${themeId}' — presentation-only theme, no content to install.`
      )
    );
  } else {
    const proceed = await runInstallPipeline(themeId, manifest);
    if (!proceed) {
      // Validation failure or dry run — don't change the active theme.
      process.exit(argv['dry-run'] ? 0 : 1);
    }
  }

  // `--content-only`: install the content but leave the active theme alone
  // (CI provisioning + e2e). Skips the config write + build.
  if (argv['content-only']) {
    console.log(
      kleur.dim(`Content installed for '${themeId}' (active theme unchanged).`)
    );
    return;
  }

  await updateConfig(themeId);
  const shouldBuild = await confirmBuild();
  if (shouldBuild) {
    await runBuild();
  } else {
    console.log(
      kleur.yellow('Remember to run "npm run build" later to apply changes.')
    );
  }
}

activateTheme()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(kleur.red('An error occurred:'), err);
    process.exit(1);
  });
