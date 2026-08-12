import {
  shapeMetafields,
  type MetafieldResolverContext
} from '../../../../../lib/metafield/index.js';
import { getShopMetaData } from '../../../../base/services/shopMetafield.js';

export default {
  Setting: {
    metafields: async (
      _setting: unknown,
      { namespace }: { namespace?: string },
      { user, metafieldDefinitionCache }: MetafieldResolverContext
    ) =>
      shapeMetafields(await getShopMetaData(), 'shop', {
        audience: user ? 'admin' : 'customer',
        namespace,
        cache: metafieldDefinitionCache
      }),
    metafield: async (
      _setting: unknown,
      { namespace, key }: { namespace: string; key: string },
      { user, metafieldDefinitionCache }: MetafieldResolverContext
    ) => {
      const all = await shapeMetafields(await getShopMetaData(), 'shop', {
        audience: user ? 'admin' : 'customer',
        namespace,
        cache: metafieldDefinitionCache
      });
      return all.find((m) => m.key === key) ?? null;
    }
  }
};
