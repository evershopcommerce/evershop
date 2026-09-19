import { jest, describe, it, expect, beforeEach } from '@jest/globals';

const settingValues = {};
jest.unstable_mockModule('../../../setting/services/setting.js', () => ({
  getSetting: async (name, defaultValue) =>
    settingValues[name] !== undefined ? settingValues[name] : defaultValue,
  getSettingSync: (name, defaultValue) =>
    settingValues[name] !== undefined ? settingValues[name] : defaultValue
}));

const {
  getShowOutOfStockProducts,
  getCollectionPageSize,
  getProductImageDimensions
} = await import('../../services/catalogSettings.js');

describe('catalog settings getters', () => {
  beforeEach(() => {
    for (const key of Object.keys(settingValues)) {
      delete settingValues[key];
    }
  });

  it('coerces string DB values to the right runtime types', () => {
    settingValues.catalogShowOutOfStockProduct = 'true';
    settingValues.catalogCollectionPageSize = '30';
    settingValues.catalogProductImageWidth = '800';
    settingValues.catalogProductImageHeight = '600';
    expect(getShowOutOfStockProducts()).toBe(true);
    expect(getCollectionPageSize()).toBe(30);
    expect(getProductImageDimensions()).toEqual({ width: 800, height: 600 });
  });

  it('reads "false" as false', () => {
    settingValues.catalogShowOutOfStockProduct = 'false';
    expect(getShowOutOfStockProducts()).toBe(false);
  });

  it('clamps the collection page size to at least 1 and falls back on non-numbers', () => {
    settingValues.catalogCollectionPageSize = '0';
    expect(getCollectionPageSize()).toBe(1);
    settingValues.catalogCollectionPageSize = 'abc';
    expect(getCollectionPageSize()).toBe(20);
  });

  it('returns the defaults when no setting is present', () => {
    expect(getShowOutOfStockProducts()).toBe(false);
    expect(getCollectionPageSize()).toBe(20);
    expect(getProductImageDimensions()).toEqual({ width: 1200, height: 1200 });
  });
});
