import { select } from '@evershop/postgres-query-builder';
import config from 'config';
import {
  mergeEnabledLocales,
  normalizeLocale
} from '../../../lib/locale/localeResolution.js';
import { pool } from '../../../lib/postgres/connection.js';
import { getConfig } from '../../../lib/util/getConfig.js';

/**
 * Read a legacy `shop.currency` / `shop.weightUnit` / `shop.dimensionUnit` value straight from
 * node-config. These keys were removed from the typed `getConfig` surface (they are admin
 * settings now — see {@link getStoreCurrency} / {@link getWeightUnit} / {@link getDimensionUnit});
 * this reads them untyped purely as the backward-compatible fallback for stores that still
 * declare them in config.json.
 */
function getLegacyConfig(path: string, defaultValue: string): string {
  return config.has(path) ? (config.get(path) as string) : defaultValue;
}

export type Setting = {
  name: string;
  value: unknown;
  is_json?: boolean | number;
};

let setting: Setting[] | undefined;

export async function getSetting<T>(name: string, defaultValue: T): Promise<T> {
  if (!setting) {
    setting = await select().from('setting').execute(pool);
  }
  const row = setting.find((s) => s.name === name);
  if (!row) {
    return defaultValue;
  }
  // Values stored with is_json=1 (objects/arrays, e.g. storeLanguages) are persisted as
  // JSON strings by saveSetting — parse them back so callers get the real value, not a
  // string. Fall back to the default on malformed JSON.
  if (row.is_json) {
    try {
      return JSON.parse(row.value as string) as T;
    } catch {
      return defaultValue;
    }
  }
  return row.value as T;
}

/**
 * Synchronous companion to {@link getSetting}: reads the already-loaded in-memory cache and
 * never touches the database. Returns `defaultValue` when the cache has not been warmed yet
 * (warmed at boot in `modules/setting/bootstrap.ts`, and per event-batch in the subscriber
 * process) or the row is absent. Use only in genuinely synchronous paths — the pricing
 * formatter, Handlebars email helpers, AJV schema builders — and prefer async `getSetting`
 * everywhere else.
 */
export function getSettingSync<T>(name: string, defaultValue: T): T {
  if (!setting) {
    return defaultValue;
  }
  const row = setting.find((s) => s.name === name);
  if (!row) {
    return defaultValue;
  }
  if (row.is_json) {
    try {
      return JSON.parse(row.value as string) as T;
    } catch {
      return defaultValue;
    }
  }
  return row.value as T;
}

export async function refreshSetting(): Promise<void> {
  setting = await select().from('setting').execute(pool);
}

export async function getStoreName(
  defaultValue: string = 'Evershop'
): Promise<string> {
  return await getSetting('storeName', defaultValue);
}

export function getStoreDescription(): Promise<string | null> {
  return getSetting('storeDescription', null);
}

/**
 * Language settings (spec §6.1 D11). DB-backed (admin Store Setting page), falling back
 * to config `shop.language` when the setting is empty OR absent — so a freshly upgraded
 * / half-seeded store behaves exactly like today (single language = `shop.language`).
 */
export async function getStoreLanguage(): Promise<string> {
  return (
    normalizeLocale(await getSetting<unknown>('storeLanguage', '')) ??
    getConfig('shop.language', 'en')
  );
}

/**
 * Enabled storefront locales — the deduped union of the default and the configured
 * "additional" list (`storeLanguages`), default first. So the default is ALWAYS enabled,
 * and a default that also appears in the additional list is just deduped (no conflict).
 */
export async function getEnabledLanguages(): Promise<string[]> {
  const defaultLocale = await getStoreLanguage();
  const list = await getSetting<unknown>('storeLanguages', []);
  return mergeEnabledLocales(defaultLocale, list);
}

/**
 * The configured ADDITIONAL languages — the enabled set minus the default. This is what
 * the admin picks in "Additional languages"; it strips the default even if a legacy
 * `storeLanguages` value still contains it, so the form never shows the default as an
 * "additional" entry.
 */
export async function getAdditionalLanguages(): Promise<string[]> {
  const defaultLocale = await getStoreLanguage();
  return (await getEnabledLanguages()).filter(
    (locale) => locale !== defaultLocale
  );
}

/** Admin panel locale (store-wide, independent of the storefront). Defaults to `'en'`. */
export async function getAdminLanguage(): Promise<string> {
  return normalizeLocale(await getSetting<unknown>('adminLanguage', '')) ?? 'en';
}

/**
 * Store currency (ISO 4217). Reads the admin setting `storeCurrency` from the in-memory cache,
 * falling back to config `shop.currency`. SYNCHRONOUS and cache-only — no per-call DB round-trip
 * — so it is safe in the pricing formatter, cart build, email helpers and other hot/sync paths.
 * The cache is warmed at boot (modules/setting/bootstrap.ts) and refreshed on save; a cold cache
 * (e.g. unit tests with no DB) simply returns the config fallback, matching the legacy behaviour.
 * An existing cart/order keeps its own persisted `currency` — this is only the default for NEW
 * carts and the display fallback when no currency is in context.
 */
export function getStoreCurrency(): string {
  return getSettingSync<string>(
    'storeCurrency',
    getLegacyConfig('shop.currency', 'USD')
  );
}

/**
 * Store DISPLAY timezone (IANA name). Reads the admin setting `storeTimeZone` from the cache,
 * falling back to the operational `shop.timezone` config. Drives date-display formatting (the
 * `DateTime` GraphQL type). It is NOT the database-session timezone — that stays `shop.timezone`
 * (config), set by the pool at connection time before any query can run. Synchronous, cache-only.
 */
export function getStoreTimezone(): string {
  return getSettingSync<string>(
    'storeTimeZone',
    getConfig('shop.timezone', 'UTC')
  );
}

/**
 * Store weight unit (kg | g | lb | oz). Reads the admin setting `weightUnit` from the cache,
 * falling back to legacy config `shop.weightUnit`. Stored product/package weights are unit-less
 * numbers; changing this relabels them, it does not convert. Synchronous, cache-only.
 */
export function getWeightUnit(): string {
  return getSettingSync<string>(
    'weightUnit',
    getLegacyConfig('shop.weightUnit', 'kg')
  );
}

/**
 * Store dimension unit (cm | mm | in). Reads the admin setting `dimensionUnit` from the cache,
 * falling back to legacy config `shop.dimensionUnit`. Same reinterpret-not-convert semantics as
 * the weight unit. Synchronous, cache-only.
 */
export function getDimensionUnit(): string {
  return getSettingSync<string>(
    'dimensionUnit',
    getLegacyConfig('shop.dimensionUnit', 'cm')
  );
}

export async function getStoreEmail(): Promise<string | null> {
  return await getSetting('storeEmail', null);
}

export async function getStorePhoneNumber(): Promise<string | null> {
  return await getSetting('storePhoneNumber', null);
}

export function getStoreCountry(): Promise<string | null> {
  return getSetting('storeCountry', null);
}

export function getStoreProvince(): Promise<string | null> {
  return getSetting('storeProvince', null);
}

export function getStoreCity(): Promise<string | null> {
  return getSetting('storeCity', null);
}

export function getStoreAddress(): Promise<string | null> {
  return getSetting('storeAddress', null);
}

export function getStorePostalCode(): Promise<string | null> {
  return getSetting('storePostalCode', null);
}
