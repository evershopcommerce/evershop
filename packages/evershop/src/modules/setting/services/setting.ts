import { select } from '@evershop/postgres-query-builder';
import {
  mergeEnabledLocales,
  normalizeLocale
} from '../../../lib/locale/localeResolution.js';
import { pool } from '../../../lib/postgres/connection.js';
import { getConfig } from '../../../lib/util/getConfig.js';

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
