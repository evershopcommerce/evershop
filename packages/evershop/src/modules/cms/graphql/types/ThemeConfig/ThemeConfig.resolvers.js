import { getConfig } from '../../../../../lib/util/getConfig.js';
import { getShopMetaData } from '../../../../base/services/shopMetafield.js';
import { getSetting } from '../../../../setting/services/setting.js';

export default {
  Query: {
    themeConfig: async () => {
      const themeConfig = getConfig('themeConfig');
      // The footer copyright is a store-wide "copyright" text metafield
      // (owner_type=shop, namespace=custom — seeded in base/migration
      // Version-1.0.6). Overlay its value onto themeConfig.copyRight so the
      // storefront and admin footers show the merchant's text; fall back to the
      // theme config default when it is unset. Wrapped in try/catch so a
      // metafield read failure can never break footer rendering.
      let copyRight = themeConfig?.copyRight;
      // The footers add "Powered by EverShop" until the store owner writes
      // their own copyright text in admin. A config/theme copyRight does not
      // hide it: store owners never set that one.
      let showPoweredBy = true;
      try {
        const value = (await getShopMetaData())?.custom?.copyright;
        if (typeof value === 'string' && value.trim() !== '') {
          copyRight = value;
          showPoweredBy = false;
        }
      } catch {
        // Non-fatal — keep the config default.
      }
      // Nothing set anywhere (no metafield, no theme value): render a live
      // default from the store's own name and the CURRENT year, so a fresh
      // store never ships "© 2022 Evershop" in its footer. No "All Rights
      // Reserved": it has no legal effect, and it would be untranslated English.
      if (typeof copyRight !== 'string' || copyRight.trim() === '') {
        try {
          const storeName = await getSetting('storeName', 'EverShop');
          copyRight = `© ${new Date().getFullYear()} ${storeName}`;
        } catch {
          copyRight = `© ${new Date().getFullYear()} EverShop`;
        }
      }
      return { ...themeConfig, copyRight, showPoweredBy };
    }
  }
};
