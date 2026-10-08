import { jest, describe, it, expect } from '@jest/globals';

/**
 * `getActiveLocale()` has two jobs: hand back the request's resolved locale inside a
 * `runWithLocale` scope, and pick a sane default outside one (cron jobs, event subscribers,
 * anything running before the locale middleware).
 *
 * That second job is what regressed: the fallback read `getConfig('shop.language')`, so a store
 * whose admin switched the default language kept formatting money and dates in whatever
 * `config.json` happened to say. The fallback now goes through `getStoreLanguageSync()`, which
 * checks the `storeLanguage` setting FIRST and only then config.
 */

const getStoreLanguageSync = jest.fn(() => 'de');
jest.unstable_mockModule(
  '../../../../modules/setting/services/setting.js',
  () => ({ getStoreLanguageSync })
);

const { getActiveLocale, runWithLocale } = await import(
  '../../localeContext.js'
);

const ctx = (locale: string) => ({
  locale,
  defaultLocale: 'en',
  available: ['en', 'fr', 'de'],
  dict: {},
  isAdmin: false
});

describe('getActiveLocale — off-request fallback', () => {
  it('falls back to the store language setting, not config', () => {
    expect(getActiveLocale()).toBe('de');
    expect(getStoreLanguageSync).toHaveBeenCalled();
  });

  it('prefers the request locale over the setting', () => {
    getStoreLanguageSync.mockClear();

    runWithLocale(ctx('fr'), () => {
      expect(getActiveLocale()).toBe('fr');
      // Inside a request there is nothing to fall back to — the setting is not read at all.
      expect(getStoreLanguageSync).not.toHaveBeenCalled();
    });
  });

  it('uses the admin locale inside an admin scope', () => {
    runWithLocale({ ...ctx('vi'), isAdmin: true }, () => {
      expect(getActiveLocale()).toBe('vi');
    });
  });

  it('re-reads the setting on every off-request call (picks up refreshSetting)', () => {
    getStoreLanguageSync.mockReturnValue('nl');

    expect(getActiveLocale()).toBe('nl');
  });
});
