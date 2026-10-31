import { jest, describe, it, expect, beforeEach } from '@jest/globals';

/**
 * `themeConfig.showPoweredBy`: the footers add "Powered by EverShop" until
 * the store owner writes their own copyright text in admin (the shop
 * "copyright" custom field). A copyRight from config or a theme does not
 * hide it.
 */
const state = { config: {}, metafield: undefined, metafieldError: false };
jest.unstable_mockModule('../../../../lib/util/getConfig.js', () => ({
  getConfig: () => state.config
}));
jest.unstable_mockModule('../../../base/services/shopMetafield.js', () => ({
  getShopMetaData: async () => {
    if (state.metafieldError) throw new Error('metafield read failed');
    return { custom: { copyright: state.metafield } };
  }
}));
jest.unstable_mockModule('../../../setting/services/setting.js', () => ({
  getSetting: async (name, defaultValue) =>
    name === 'storeName' ? 'Daylight' : defaultValue
}));

const resolvers = (
  await import('../../graphql/types/ThemeConfig/ThemeConfig.resolvers.js')
).default;
const themeConfig = () => resolvers.Query.themeConfig();
const year = new Date().getFullYear();

describe('themeConfig.showPoweredBy', () => {
  beforeEach(() => {
    state.config = {};
    state.metafield = undefined;
    state.metafieldError = false;
  });

  it('is true with the generated copyright line, which has no "All Rights Reserved"', async () => {
    expect(await themeConfig()).toEqual(
      expect.objectContaining({
        copyRight: `© ${year} Daylight`,
        showPoweredBy: true
      })
    );
  });

  it("is false once the store owner's own text is saved in admin", async () => {
    state.metafield = '© Daylight Coffee Roasters';
    expect(await themeConfig()).toEqual(
      expect.objectContaining({
        copyRight: '© Daylight Coffee Roasters',
        showPoweredBy: false
      })
    );
  });

  it('stays true when the admin text is blank', async () => {
    state.metafield = '   ';
    expect((await themeConfig()).showPoweredBy).toBe(true);
  });

  it('stays true when the text comes from config or a theme', async () => {
    state.config = { copyRight: '© Theme text' };
    expect(await themeConfig()).toEqual(
      expect.objectContaining({ copyRight: '© Theme text', showPoweredBy: true })
    );
  });

  it('admin text wins over config text, and hides the credit', async () => {
    state.config = { copyRight: '© Theme text' };
    state.metafield = '© Admin text';
    expect(await themeConfig()).toEqual(
      expect.objectContaining({ copyRight: '© Admin text', showPoweredBy: false })
    );
  });

  it('stays true when the custom field cannot be read', async () => {
    state.metafieldError = true;
    expect((await themeConfig()).showPoweredBy).toBe(true);
  });
});
