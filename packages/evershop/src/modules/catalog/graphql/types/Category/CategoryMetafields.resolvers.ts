import {
  shapeMetafields,
  type MetaData,
  type MetafieldResolverContext
} from '../../../../../lib/metafield/index.js';

type CategoryParent = { metaData?: MetaData };

export default {
  Category: {
    metafields: (
      category: CategoryParent,
      { namespace }: { namespace?: string },
      { user, metafieldDefinitionCache }: MetafieldResolverContext
    ) =>
      shapeMetafields(category.metaData ?? {}, 'category', {
        audience: user ? 'admin' : 'customer',
        namespace,
        cache: metafieldDefinitionCache
      }),
    metafield: async (
      category: CategoryParent,
      { namespace, key }: { namespace: string; key: string },
      { user, metafieldDefinitionCache }: MetafieldResolverContext
    ) => {
      const all = await shapeMetafields(category.metaData ?? {}, 'category', {
        audience: user ? 'admin' : 'customer',
        namespace,
        cache: metafieldDefinitionCache
      });
      return all.find((m) => m.key === key) ?? null;
    }
  }
};
