import { shapeMetafields } from '../../../../../lib/metafield/index.js';
import { getShopMetaData } from '../../../../base/services/shopMetafield.js';

export default {
  Setting: {
    metafields: async (
      _setting: unknown,
      { namespace }: { namespace?: string },
      { user }: { user?: unknown }
    ) =>
      shapeMetafields(await getShopMetaData(), 'shop', {
        audience: user ? 'admin' : 'customer',
        namespace
      }),
    metafield: async (
      _setting: unknown,
      { namespace, key }: { namespace: string; key: string },
      { user }: { user?: unknown }
    ) => {
      const all = await shapeMetafields(await getShopMetaData(), 'shop', {
        audience: user ? 'admin' : 'customer',
        namespace
      });
      return all.find((m) => m.key === key) ?? null;
    }
  }
};
