#!/usr/bin/env node
/* eslint-disable no-console */
import 'dotenv/config';
import fs from 'fs/promises';
import path from 'path';
import enquirer from 'enquirer';
import kleur from 'kleur';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { pool } from '../../lib/postgres/connection.js';
import { exportToManifest, listExportablePages } from '../../lib/theme/export.js';
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
  .option('pages', {
    type: 'string',
    description:
      'comma-separated landing page uuids to export (default: every page this theme has content on)'
  })
  .option('no-pages', {
    type: 'boolean',
    default: false,
    description: 'skip the landingPages section entirely'
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

/**
 * Which landing pages go into the manifest.
 *
 * A theme's pages are DERIVED (pages it has content on), which on the author's
 * own store can include test pages or a Duplicate copy of a shipped page. So
 * the set is confirmable: `--no-pages` skips the section, `--pages a,b` pins
 * it, an interactive terminal gets a multi-select, and a non-TTY run exports
 * everything derived (and says so).
 *
 * Returns `undefined` to mean "every derived page" — the export default.
 */
async function resolvePageSelection(
  themeId: string
): Promise<string[] | undefined> {
  // yargs' boolean-negation turns `--no-pages` into `pages: false` because
  // `pages` is a declared option, so accept either spelling.
  if (argv['no-pages'] || (argv.pages as unknown) === false) return [];
  if (typeof argv.pages === 'string' && argv.pages.length > 0) {
    return argv.pages
      .split(',')
      .map((u) => u.trim())
      .filter(Boolean);
  }
  const pages = await listExportablePages(themeId, pool);
  if (pages.length === 0) return undefined;
  if (!process.stdin.isTTY) {
    console.log(
      kleur.dim(
        `Exporting ${pages.length} landing page(s): ${pages
          .map((p) => p.name)
          .join(', ')} (use --pages / --no-pages to narrow).`
      )
    );
    return undefined;
  }
  const response = (await enquirer.prompt({
    type: 'multiselect',
    name: 'selected',
    message:
      'Landing pages to include (space to toggle, enter to confirm):',
    // enquirer returns the CHOICE NAMES; carry the uuid in the value so two
    // pages with the same name stay distinguishable.
    choices: pages.map((p) => ({
      name: `${p.name}  (/${p.url_key})`,
      value: p.uuid,
      enabled: true
    })),
    // `result` maps the selected names back to their values.
    result(names: string[]) {
      return (names as unknown as string[]).map(
        (n) => (this as unknown as { find: (n: string) => { value: string } }).find(n).value
      );
    }
  } as never)) as { selected: string[] };
  return response.selected;
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

  const landingPageUuids = await resolvePageSelection(themeId);

  const manifest = await exportToManifest({
    themeId,
    pool,
    version,
    preserveThemeName: existing?.theme_name,
    landingPageUuids
  });

  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(target, JSON.stringify(manifest, null, 2), 'utf8');
  const pageCount = manifest.landingPages?.length ?? 0;
  console.log(
    kleur.green(
      `Wrote ${target} (${manifest.widgets.length} widgets, ` +
        `${manifest.placements.length} placements` +
        (pageCount > 0 ? `, ${pageCount} landing pages` : '') +
        `).`
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
