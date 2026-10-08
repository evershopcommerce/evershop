/**
 * Region providers: the geographic hierarchy below country (specification
 * § 3.3). One default provider per country over the generated data; a
 * package replaces it with `registerRegionProvider` from `bootstrap.ts`.
 *
 * Rules: the stored value is the provider's key; keys are append-only
 * (`retired` hides, never removes); a level is enumerated iff the provider
 * lists it.
 */
import { DEFAULT_REGIONS } from './data/regions.js';
import {
  bumpRegistryGeneration,
  getAddressFormat,
  isAddressRegistryLocked
} from './formats.js';
import { getAddressRuntime } from './runtime.js';
import type { AddressLevel, Region, RegionProvider } from './types.js';

const providers = new Map<string, RegionProvider>();

function normalizeCode(code: string | undefined | null): string {
  return typeof code === 'string' ? code.trim().toUpperCase() : '';
}

/**
 * The bundled provider for a country: one `administrative_area` level when the
 * generated data has entries for it, otherwise every level is free text. The
 * default data ignores `locale` in this release (English names, plus the
 * native and latin names the data carries).
 */
function defaultProvider(cc: string): RegionProvider {
  const regions = Object.prototype.hasOwnProperty.call(DEFAULT_REGIONS, cc)
    ? DEFAULT_REGIONS[cc]
    : undefined;
  if (!regions || regions.length === 0) {
    return { levels: [], list: () => [] };
  }
  return {
    levels: ['administrative_area'],
    list: (parentPath: string[]) => (parentPath.length === 0 ? regions : [])
  };
}

/**
 * Replaces the provider for a country. From `bootstrap.ts` only: throws after
 * `lockAddressRegistry()`. A provider that replaces a list wholesale must
 * carry the old keys as retired entries (append-only rule).
 */
export function registerRegionProvider(
  country: string,
  provider: RegionProvider
): void {
  const cc = normalizeCode(country);
  if (isAddressRegistryLocked()) {
    throw new Error(
      `Cannot register region provider for '${cc}' after bootstrap. ` +
        `Call registerRegionProvider from your extension's bootstrap.ts.`
    );
  }
  if (!cc) {
    throw new Error('registerRegionProvider requires a country code.');
  }
  if (
    !provider ||
    !Array.isArray(provider.levels) ||
    typeof provider.list !== 'function'
  ) {
    throw new Error(
      `registerRegionProvider('${cc}') requires a provider with 'levels' and 'list'.`
    );
  }
  providers.set(cc, { levels: [...provider.levels], list: provider.list });
  bumpRegistryGeneration();
}

export function getRegionProvider(country: string): RegionProvider {
  const cc = normalizeCode(country);
  return providers.get(cc) ?? defaultProvider(cc);
}

/** The levels a country enumerates, outermost first. Empty = all free text. */
export function getRegionLevels(country: string): AddressLevel[] {
  return [...getRegionProvider(country).levels];
}

async function listAt(
  provider: RegionProvider,
  parentPath: string[],
  locale?: string
): Promise<Region[]> {
  const regions = await provider.list(parentPath, locale);
  return Array.isArray(regions) ? regions : [];
}

/**
 * Active regions under `parentPath` (keys of the outer levels; `[]` is the top
 * level). Retired entries are filtered out: this is what forms and admin
 * pickers offer. Returns copies, so callers may annotate them freely.
 */
export async function getRegions(
  country: string,
  parentPath: string[],
  locale?: string
): Promise<Region[]> {
  const provider = getRegionProvider(country);
  const path = parentPath ?? [];
  if (path.length >= provider.levels.length) {
    return [];
  }
  const regions = await listAt(provider, path, locale);
  return regions.filter((r) => !r.retired).map((r) => ({ ...r }));
}

/**
 * Finds the list that holds `level` for the given parents, or `undefined` when
 * the provider does not enumerate that level or the parents are not known.
 */
async function listForLevel(
  country: string,
  level: AddressLevel,
  parentPath: string[] | undefined,
  locale?: string
): Promise<Region[] | undefined> {
  const provider = getRegionProvider(country);
  const index = provider.levels.indexOf(level);
  if (index < 0) {
    return undefined;
  }
  if (index > 0 && (!parentPath || parentPath.length < index)) {
    return undefined;
  }
  return listAt(provider, (parentPath ?? []).slice(0, index), locale);
}

function baseLanguage(tag: string | undefined | null): string {
  if (typeof tag !== 'string') {
    return '';
  }
  return tag.trim().toLowerCase().split(/[-_]/)[0] ?? '';
}

/**
 * The name to show a reader in `locale`: the native `name` when the locale's
 * language is the one the record's native names are written in (Google's
 * `lang`, falling back to `languages[0]`), else `latinName` when the region
 * has one. A record with neither treats every locale as non-native. Google's
 * Hong Kong record lists `en` among its `languages` but its names are Chinese
 * (`lang: 'zh'`), so `languages` alone would show 香港島 to an English reader.
 */
function displayName(region: Region, country: string, locale: string | undefined): string {
  if (!region.latinName) {
    return region.name;
  }
  const record = getAddressFormat(country);
  const nativeLanguage = baseLanguage(record.lang ?? record.languages?.[0]);
  const base = baseLanguage(locale ?? getAddressRuntime().getLocale());
  const native = nativeLanguage !== '' && base === nativeLanguage;
  return native ? region.name || region.latinName : region.latinName;
}

/** The name to show a reader in `locale` for a region already in hand (see `displayName`). */
export function regionDisplayName(
  region: Region,
  country: string,
  locale?: string
): string {
  return displayName(region, normalizeCode(country), locale) || region.key;
}

/**
 * Display name for a stored key. Retired entries are included (a legacy order
 * must still name its province); falls back to the key itself when the level
 * is free text, the parents are missing for a deeper level, or nothing
 * matches. `locale` (default: the runtime's) picks `name` or `latinName`,
 * see `displayName`.
 */
export async function resolveRegionName(
  country: string,
  level: AddressLevel,
  key: string,
  locale?: string,
  parentPath?: string[]
): Promise<string> {
  const regions = await listForLevel(country, level, parentPath, locale);
  const match = regions?.find((r) => r.key === key);
  return match ? displayName(match, country, locale) || key : key;
}

/** True when `key` is an active (not retired) entry at `level` for the parents. */
export async function isActiveRegionKey(
  country: string,
  level: AddressLevel,
  key: string,
  parentPath?: string[]
): Promise<boolean> {
  const regions = await listForLevel(country, level, parentPath);
  return regions?.some((r) => r.key === key && !r.retired) ?? false;
}

export function __resetRegionProvidersForTests(): void {
  providers.clear();
}
