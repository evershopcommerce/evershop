import {
  commit,
  insertOnUpdate,
  rollback
} from '@evershop/postgres-query-builder';
import { getAvailableLocales } from '../../../../lib/locale/dictionary.js';
import { normalizeLocale } from '../../../../lib/locale/localeResolution.js';
import { warning } from '../../../../lib/log/logger.js';
import { getConnection } from '../../../../lib/postgres/connection.js';
import {
  INTERNAL_SERVER_ERROR,
  OK
} from '../../../../lib/util/httpStatus.js';
import { refreshSetting } from '../../services/setting.js';

/**
 * Validate the language settings when they are part of this save (spec §6.1 D11). Other
 * setting saves are untouched. Returns `{ error }` to block the save, or `{ warnings }`
 * (possibly empty) to let it through — a non-default enabled locale without a translation
 * folder is allowed (it falls back to the source text) but the admin is warned.
 */
function validateLanguageSettings(body) {
  if (!('storeLanguage' in body) && !('storeLanguages' in body)) {
    return { warnings: [] };
  }
  const defaultLocale = normalizeLocale(body.storeLanguage);
  // `storeLanguages` holds the ADDITIONAL languages; the enabled set is always
  // default + additional (getEnabledLanguages). A default that also appears here is just
  // deduped/merged at runtime, so there's nothing to block — no consistency error.
  const additional = Array.isArray(body.storeLanguages)
    ? body.storeLanguages.map(normalizeLocale).filter(Boolean)
    : [];
  // Warn (don't block): an additional locale with no translations/<locale>/ folder
  // renders the source (English) strings until one is added.
  const installed = new Set(['en', ...getAvailableLocales()]);
  const missing = additional.filter(
    (code) => code !== defaultLocale && !installed.has(code)
  );
  const warnings =
    missing.length > 0
      ? [
          `These languages have no translations yet and will show the source text: ${missing.join(
            ', '
          )}.`
        ]
      : [];
  return { warnings };
}

export default async (request, response, next) => {
  const { body } = request;
  const { warnings } = validateLanguageSettings(body);
  const connection = await getConnection();
  try {
    // Loop through the body and insert the data
    const promises = [];
    Object.keys(body).forEach((key) => {
      const value = body[key];
      // Arrays/objects are persisted as JSON. Guard against null explicitly: `typeof null ===
      // 'object'`, so without the `!== null` check an absent optional field (e.g. storeEmail /
      // storePhoneNumber, which the resolver defaults to null) would be JSON.stringified to the
      // literal string "null" and shown as "null" in the form after saving. Null/undefined
      // scalars are stored as an empty string instead.
      if (value !== null && typeof value === 'object') {
        promises.push(
          insertOnUpdate('setting', ['name'])
            .given({
              name: key,
              value: JSON.stringify(value),
              is_json: 1
            })
            .execute(connection, false)
        );
      } else {
        promises.push(
          insertOnUpdate('setting', ['name'])
            .given({
              name: key,
              value: value ?? '',
              is_json: 0
            })
            .execute(connection, false)
        );
      }
    });
    await Promise.all(promises);
    await commit(connection);
    // Refresh the setting
    await refreshSetting();
    if (warnings.length > 0) {
      warning(`saveSetting: ${warnings.join(' ')}`);
    }
    response.status(OK);
    response.json({
      data: {},
      warnings
    });
  } catch (error) {
    await rollback(connection);
    response.status(INTERNAL_SERVER_ERROR);
    response.json({
      error: {
        status: INTERNAL_SERVER_ERROR,
        message: error.message
      }
    });
  }
};
