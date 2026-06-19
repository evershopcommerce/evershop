#!/usr/bin/env node
/* eslint-disable no-console */
import 'dotenv/config';
import fs from 'fs/promises';
import path from 'path';
import kleur from 'kleur';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { pool } from '../../lib/postgres/connection.js';
import { exportToManifest } from '../../lib/theme/export.js';
import { readManifest } from '../../lib/theme/manifest.js';
import { assertValidThemeId } from '../../lib/theme/themeId.js';
import { assertValidVersion } from '../../lib/theme/version.js';

/**
 * `theme:export-content <theme-id> <version> [--force]`
 * (spec 04 § 6.5). Serializes the theme's live content into `theme.json`,
 * preserving widget/placement UUIDs verbatim so buyer upgrades stay stable.
 *
 * Both the theme id AND a valid-SemVer version are REQUIRED — the version is
 * load-bearing (it gates upgrades), so it must be supplied explicitly and is
 * rejected if malformed. The version may be the second positional argument or
 * `--set-version <x.y.z>`.
 */
const argv = yargs(hideBin(process.argv))
  .version(false)
  .option('force', { type: 'boolean', default: false })
  // `--set-version`, not `--version`: the top-level `evershop` yargs reserves
  // `--version` for the package version and exits before dispatch.
  .option('set-version', {
    type: 'string',
    description: 'the SemVer version to stamp into theme.json (required)'
  })
  .help()
  .parseSync();
const rawThemeId = argv._[1] != null ? String(argv._[1]) : undefined;
// Version: second positional (`theme:export-content boutique 1.2.0`) or the
// explicit `--set-version` flag.
const rawVersion =
  argv._[2] != null
    ? String(argv._[2])
    : (argv['set-version'] as string | undefined);

function themeDir(id: string): string {
  return path.join(process.cwd(), 'themes', id);
}
async function fileExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function main(): Promise<void> {
  const themeId = assertValidThemeId(rawThemeId);
  // Version is required and must be valid SemVer — fail before any file work.
  if (rawVersion == null) {
    throw new Error(
      'a version is required — usage: theme:export-content <theme-id> <version> ' +
        '(or --set-version <x.y.z>)'
    );
  }
  const version = assertValidVersion(rawVersion);

  const dir = themeDir(themeId);
  const target = path.join(dir, 'theme.json');

  const exists = await fileExists(target);
  if (exists && !argv.force) {
    throw new Error(`${target} already exists. Use --force to overwrite.`);
  }

  const existing = exists ? await readManifest(dir) : null;

  const manifest = await exportToManifest({
    themeId,
    pool,
    version,
    preserveThemeName: existing?.theme_name
  });

  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(target, JSON.stringify(manifest, null, 2), 'utf8');
  console.log(
    kleur.green(
      `Wrote ${target} (${manifest.widgets.length} widgets, ` +
        `${manifest.placements.length} placements).`
    )
  );
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(
      kleur.red('theme:export-content failed:'),
      (e as Error).message
    );
    process.exit(1);
  });
