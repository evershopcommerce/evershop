import { jest, describe, it, expect, beforeEach } from '@jest/globals';

const settingValues: Record<string, unknown> = {};
jest.unstable_mockModule('../../../setting/services/setting.js', () => ({
  getSetting: async (name: string, defaultValue: unknown) =>
    settingValues[name] !== undefined ? settingValues[name] : defaultValue,
  getSettingSync: (name: string, defaultValue: unknown) =>
    settingValues[name] !== undefined ? settingValues[name] : defaultValue
}));

const {
  DEFAULT_RELATED_PRODUCTS_RULES,
  getCrossSellFallbackEnabled,
  getCrossSellMinAnchorOrders,
  getCrossSellMinLift,
  getCrossSellMinPairCount,
  getGlobalRelatedProductsRules,
  isUsableRulesConfig
} = await import('../../services/recommendationSettings.js');

describe('recommendation settings getters', () => {
  beforeEach(() => {
    for (const key of Object.keys(settingValues)) {
      delete settingValues[key];
    }
  });

  it('returns the spec § 12 defaults when nothing is set', () => {
    expect(getCrossSellMinPairCount()).toBe(3);
    expect(getCrossSellMinAnchorOrders()).toBe(5);
    expect(getCrossSellMinLift()).toBe(1);
    expect(getCrossSellFallbackEnabled()).toBe(true);
    expect(getGlobalRelatedProductsRules()).toEqual(
      DEFAULT_RELATED_PRODUCTS_RULES
    );
  });

  it('coerces string DB values (the setting table stores scalars as TEXT)', () => {
    settingValues.crossSellMinPairCount = '4';
    settingValues.crossSellMinAnchorOrders = '10';
    settingValues.crossSellMinLift = '1.5';
    settingValues.crossSellFallbackEnabled = 'false';
    expect(getCrossSellMinPairCount()).toBe(4);
    expect(getCrossSellMinAnchorOrders()).toBe(10);
    expect(getCrossSellMinLift()).toBe(1.5);
    expect(getCrossSellFallbackEnabled()).toBe(false);
  });

  it('clamps the gates to sane floors and falls back on garbage', () => {
    settingValues.crossSellMinPairCount = '0';
    settingValues.crossSellMinAnchorOrders = 'abc';
    settingValues.crossSellMinLift = '-2';
    expect(getCrossSellMinPairCount()).toBe(1);
    expect(getCrossSellMinAnchorOrders()).toBe(5);
    expect(getCrossSellMinLift()).toBe(0);
  });

  it('returns the stored rules config when structurally usable', () => {
    const stored = {
      enabled: true,
      rules: [{ type: 'same_collection', enabled: true }]
    };
    settingValues.relatedProductsRules = stored;
    expect(getGlobalRelatedProductsRules()).toEqual(stored);
  });

  it('falls back to the default config on unusable stored values (§ 6.3 fall-through)', () => {
    const badValues: unknown[] = [
      null,
      'oops',
      42,
      [],
      { enabled: 'true', rules: [] },
      { enabled: true }
    ];
    for (const bad of badValues) {
      settingValues.relatedProductsRules = bad;
      expect(getGlobalRelatedProductsRules()).toEqual(
        DEFAULT_RELATED_PRODUCTS_RULES
      );
    }
  });

  it('isUsableRulesConfig demands typed enabled + rules array, nothing deeper', () => {
    expect(isUsableRulesConfig({ enabled: false, rules: [] })).toBe(true);
    expect(isUsableRulesConfig({ enabled: 'false', rules: [] })).toBe(false);
    expect(isUsableRulesConfig({ enabled: true })).toBe(false);
    expect(isUsableRulesConfig([])).toBe(false);
    expect(isUsableRulesConfig(null)).toBe(false);
  });
});
