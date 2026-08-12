import fs from 'fs';
import path from 'path';
import { CONSTANTS } from '../helpers.js';
import { error } from '../log/logger.js';
import { readCsvFile } from '../util/readCsvFile.js';
import { getValue } from '../util/registry.js';

/**
 * Runtime translation dictionary registry.
 *
 * The single source of truth for "give me the translations for a locale". Built
 * from disk (`translations/<locale>/*.csv`) at boot and held in memory for the
 * lifetime of the process. See `specifications/translation-refactoring.md`
 * §6.2 (registry), §6.20 (pluggable source seam), §6.22 (per-page slice).
 *
 * P1 scope: this module + its wiring into bootstrap. The consumers (`_()`,
 * `translate()`, render/eContext) are migrated in later phases — this is additive,
 * so existing build-time/runtime translation keeps working until then.
 */

// locale -> { englishSource: translatedText }
const registry: Record<string, Record<string, string>> = {};

// Memoized per-page slices, keyed `${routeId}::${locale}` (see getPageDictionary).
const pageDictionaryCache = new Map<string, Record<string, string>>();

function translationsRoot(): string {
  return path.resolve(CONSTANTS.ROOTPATH, 'translations');
}

/**
 * Locale folders present on disk under `translations/`. These are the *translated*
 * locales; the source language (English) has no folder — its dictionary is empty
 * and `_()` / `translate()` simply return the source string unchanged.
 */
function listLocaleFolders(): string[] {
  const root = translationsRoot();
  try {
    if (!fs.existsSync(root)) {
      return [];
    }
    return fs.readdirSync(root).filter((name) => {
      try {
        return fs.statSync(path.join(root, name)).isDirectory();
      } catch {
        return false;
      }
    });
  } catch (err) {
    error(err);
    return [];
  }
}

/**
 * Base layer: read and merge every `*.csv` in `translations/<locale>/` into a flat
 * `{ source: translation }` map. Files merge in sorted filename order so a key
 * defined in two files resolves deterministically (last file wins). Needs no DB/config.
 */
export async function loadLocale(
  locale: string
): Promise<Record<string, string>> {
  try {
    const folderPath = path.join(translationsRoot(), locale);
    if (!fs.existsSync(folderPath)) {
      return {};
    }
    const files = (await fs.promises.readdir(folderPath))
      .filter((file) => path.extname(file) === '.csv')
      .sort();
    const result: Record<string, string> = {};
    for (const file of files) {
      const data = await readCsvFile<string>(path.join(folderPath, file));
      Object.assign(result, data);
    }
    return result;
  } catch (err) {
    error(err);
    return {};
  }
}

/**
 * Override seam (spec §6.20). Default behaviour is identity: with no
 * `localeDictionary` processor registered, `getValue` returns the disk base
 * unchanged. A future admin-managed-translation module registers a processor
 * (DB overrides win) without touching this file or any call site.
 */
export async function composeLocaleDictionary(
  locale: string,
  base: Record<string, string>
): Promise<Record<string, string>> {
  return getValue<Record<string, string>>('localeDictionary', base, { locale });
}

async function buildLocale(locale: string): Promise<Record<string, string>> {
  return composeLocaleDictionary(locale, await loadLocale(locale));
}

/**
 * Scan every locale folder on disk and build its effective dictionary into the
 * registry. Disk-only, so it is safe to run at bootstrap (before migrations).
 * Sequential on purpose: the override seam shares one registry slot per call.
 */
export async function loadAllLocales(): Promise<void> {
  for (const locale of listLocaleFolders()) {
    registry[locale] = await buildLocale(locale);
  }
  pageDictionaryCache.clear();
}

/** Rebuild one locale's effective dictionary and hot-swap it (e.g. after an admin edit). */
export async function reloadLocale(locale: string): Promise<void> {
  registry[locale] = await buildLocale(locale);
  for (const key of [...pageDictionaryCache.keys()]) {
    if (key.endsWith(`::${locale}`)) {
      pageDictionaryCache.delete(key);
    }
  }
}

/** Rebuild every locale (e.g. post-startup, once DB-backed overrides are available). */
export async function reloadAllLocales(): Promise<void> {
  await loadAllLocales();
}

/** Locales that have a dictionary on disk (the source language is not included). */
export function getAvailableLocales(): string[] {
  return Object.keys(registry);
}

/**
 * The full in-memory dictionary for a locale. Empty object when the locale has no
 * folder (callers then fall back to the source string).
 */
export function getDictionary(locale: string): Record<string, string> {
  return registry[locale] ?? {};
}

/**
 * The dictionary shipped to the client for one page (`eContext.translations`). Ships the
 * **full locale dict**, memoized per (route, locale).
 *
 * Per-page slicing (§6.22) was attempted in P6c and **backed out**: a source-level
 * per-route key scan under-includes — `getComponentsByRoute` returns only top-level
 * page/area components, so `_()` keys in their imported children are missed (the
 * homepage scanned to 0 keys, which would blank its translations). Correct slicing
 * needs a webpack-level key collector (sees the full per-entry module graph); deferred.
 * The full locale dict is small and always correct.
 */
export function getPageDictionary(
  route: { id: string; isAdmin?: boolean } | undefined,
  locale: string
): Record<string, string> {
  const cacheKey = `${route?.id}::${locale}`;
  const cached = pageDictionaryCache.get(cacheKey);
  if (cached) {
    return cached;
  }
  const dict = getDictionary(locale);
  pageDictionaryCache.set(cacheKey, dict);
  return dict;
}
