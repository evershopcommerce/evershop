import fs from 'fs';
import path from 'path';
import { info } from '../../lib/log/logger.js';
import { getEnabledTheme } from '../../lib/util/getEnabledTheme.js';

/**
 * Seed data a theme supplies (`themes/<id>/seed/*.json`).
 *
 * A demo theme only reads as a demo with content that matches it: a fashion
 * storefront needs fashion products, a bakery needs cakes. Core's seed data is
 * one generic catalogue, so every theme looked wrong on a freshly seeded store,
 * and the collections a theme's widgets name (`linen`, `gift-boxes`) existed
 * nowhere.
 *
 * A theme therefore supplies its own copies, with the SAME shape as core's
 * `bin/seed/data/*.json`. Rules, all deliberate:
 *
 *  - **Only `evershop seed` reads them.** `theme:active` still creates nothing;
 *    seeding stays a separate, explicit, opt-in command (The Nguyen, 2026-09-14).
 *  - **Per file, replace not merge.** A theme that ships `products.json` replaces
 *    core's products entirely and still inherits core's `attributes.json`.
 *    Merging a fashion catalogue into a ceramics one is worse than either.
 *  - **Said out loud.** The command reports every file it took from the theme,
 *    because the same command producing different data depending on the active
 *    theme is otherwise a surprise.
 */

export type SeedDataFile =
  | 'attributes'
  | 'categories'
  | 'collections'
  | 'products'
  | 'pages'
  | 'blog';

export interface SeedDataSource {
  /** Absolute path of the file that was read. */
  file: string;
  /** Where it came from — reported by the CLI. */
  origin: 'theme' | 'core';
  themeName?: string;
}

/** `themes/<active>/seed/<name>.json`, or null when there is no theme or no file. */
export function themeSeedFile(name: SeedDataFile): string | null {
  const theme = getEnabledTheme();
  if (!theme) {
    return null;
  }
  const file = path.join(theme.path, 'seed', `${name}.json`);
  return fs.existsSync(file) ? file : null;
}

/**
 * The file a seeder should read for `name`: the active theme's copy when it has
 * one, otherwise core's. `coreDir` is the caller's own `data/` directory, so
 * this works the same from `src` and from `dist`.
 */
export function resolveSeedData<T = unknown>(
  name: SeedDataFile,
  coreDir: string
): { data: T; source: SeedDataSource } {
  const themeFile = themeSeedFile(name);
  const file = themeFile ?? path.join(coreDir, `${name}.json`);
  const data = JSON.parse(fs.readFileSync(file, 'utf-8')) as T;
  const theme = getEnabledTheme();
  return {
    data,
    source: themeFile
      ? { file, origin: 'theme', themeName: theme?.name }
      : { file, origin: 'core' }
  };
}

/** One line per seeder, so it is never a mystery whose data was used. */
export function reportSeedSource(name: SeedDataFile, source: SeedDataSource): void {
  if (source.origin === 'theme') {
    info(`Using ${name}.json from theme "${source.themeName}".`);
  }
}

/**
 * Resolve an image reference in seed data. A theme ships its photos in its own
 * `public/` folder — the same place `theme.json` assets come from — so its seed
 * data names them relatively (`demo/product-01.jpg`) instead of pointing at a
 * URL. Core's data keeps using absolute URLs, which still download.
 *
 * Returns an absolute path when the image is a local theme file, or null when
 * the reference is a URL the caller should download.
 */
export function resolveSeedImage(url: string): string | null {
  if (!url || /^[a-z][a-z0-9+.-]*:\/\//i.test(url)) {
    return null;
  }
  const theme = getEnabledTheme();
  if (!theme) {
    return null;
  }
  const rel = url.replace(/^\/+/, '');
  const file = path.join(theme.path, 'public', rel);
  const root = path.join(theme.path, 'public');
  if (!file.startsWith(root) || !fs.existsSync(file)) {
    return null;
  }
  return file;
}
