import { getStoreLanguageSync } from '../../../modules/setting/services/setting.js';
import { getDictionary } from '../dictionary.js';
import { interpolate } from '../interpolate.js';
import { getLocaleContext } from '../localeContext.js';

/**
 * Server-side translation (spec §6.6). Resolves the dictionary by precedence:
 *   1. an explicit `locale` — off-request callers (emails, cron jobs) that must pick a
 *      specific language regardless of the ambient request (§6.16 / D7);
 *   2. the current request's ALS dictionary, set by the locale middleware (P4);
 *   3. the default store language's dictionary from the registry — the off-request
 *      fallback. "Default store language" is the admin `storeLanguage` setting, with config
 *      `shop.language` only as ITS fallback; reading config directly would ignore every store
 *      that has changed its language in the admin.
 *
 * Server-only: imports `localeContext` (which owns `AsyncLocalStorage`). For client /
 * template strings use `_` instead. Missing OR empty entries fall back to the source.
 */
export function translate(
  enText: string,
  values: Record<string, string> = {},
  locale?: string
): string {
  let dict: Record<string, string>;
  if (locale) {
    dict = getDictionary(locale);
  } else {
    dict = getLocaleContext()?.dict ?? getDictionary(getStoreLanguageSync());
  }
  return interpolate(dict[enText] || enText, values);
}
