import { jest, describe, it, expect, beforeEach } from '@jest/globals';

/**
 * `getStoreLanguageSync` is the synchronous reader behind every display-locale decision:
 * `getActiveLocale()`'s off-request fallback, the `Intl` formatters for `Price.text` /
 * `DateTime.text` / `toPrice`, and the Handlebars email helpers. All of those used to read
 * `getConfig('shop.language')` directly, which is stale for any store that changed its
 * language on the admin Store Setting page — config.json is never touched by that save.
 *
 * So what this pins is the precedence: the `storeLanguage` SETTING first, config only as its
 * fallback, and a cold cache behaving exactly like the legacy config-only path.
 */

const rows: { name: string; value: unknown; is_json?: number }[] = [];

jest.unstable_mockModule('@evershop/postgres-query-builder', () => ({
  select: () => ({
    from: () => ({ execute: async () => rows })
  })
}));
jest.unstable_mockModule('../../../../lib/postgres/connection.js', () => ({
  pool: {}
}));

const getConfig = jest.fn((_key: string, def: unknown) => def);
jest.unstable_mockModule('../../../../lib/util/getConfig.js', () => ({
  getConfig
}));

const { getStoreLanguageSync, refreshSetting } = await import(
  '../../services/setting.js'
);

/** Replace the rows the mocked `select()` returns, then warm the cache from them. */
const warmCacheWith = async (
  next: { name: string; value: unknown; is_json?: number }[]
) => {
  rows.length = 0;
  rows.push(...next);
  await refreshSetting();
};

describe('getStoreLanguageSync', () => {
  beforeEach(() => {
    getConfig.mockClear();
  });

  it('returns the storeLanguage setting when the cache is warm', async () => {
    await warmCacheWith([{ name: 'storeLanguage', value: 'de' }]);

    expect(getStoreLanguageSync()).toBe('de');
    // The setting answered, so config is never consulted.
    expect(getConfig).not.toHaveBeenCalled();
  });

  it('normalizes the stored value (trim + lowercase)', async () => {
    await warmCacheWith([{ name: 'storeLanguage', value: '  FR  ' }]);

    expect(getStoreLanguageSync()).toBe('fr');
  });

  it('falls back to config when the setting row is absent', async () => {
    await warmCacheWith([{ name: 'storeCurrency', value: 'EUR' }]);

    expect(getStoreLanguageSync()).toBe('en');
    expect(getConfig).toHaveBeenCalledWith('shop.language', 'en');
  });

  it('falls back to config when the setting is stored empty', async () => {
    // `saveSetting` writes '' for a cleared field — that must not win over config.
    await warmCacheWith([{ name: 'storeLanguage', value: '' }]);

    expect(getStoreLanguageSync()).toBe('en');
    expect(getConfig).toHaveBeenCalledWith('shop.language', 'en');
  });

  it('honours the configured language when config supplies one', async () => {
    await warmCacheWith([]);
    getConfig.mockImplementation((key: string, def: unknown) =>
      key === 'shop.language' ? 'vi' : def
    );

    expect(getStoreLanguageSync()).toBe('vi');
  });
});
