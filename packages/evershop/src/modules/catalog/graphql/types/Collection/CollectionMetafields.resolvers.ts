import {
  shapeMetafields,
  type MetaData,
  type MetafieldResolverContext
} from '../../../../../lib/metafield/index.js';

type CollectionParent = { metaData?: MetaData };

export default {
  Collection: {
    metafields: (
      collection: CollectionParent,
      { namespace }: { namespace?: string },
      { user, metafieldDefinitionCache }: MetafieldResolverContext
    ) =>
      shapeMetafields(collection.metaData ?? {}, 'collection', {
        audience: user ? 'admin' : 'customer',
        namespace,
        cache: metafieldDefinitionCache
      }),
    metafield: async (
      collection: CollectionParent,
      { namespace, key }: { namespace: string; key: string },
      { user, metafieldDefinitionCache }: MetafieldResolverContext
    ) => {
      const all = await shapeMetafields(collection.metaData ?? {}, 'collection', {
        audience: user ? 'admin' : 'customer',
        namespace,
        cache: metafieldDefinitionCache
      });
      return all.find((m) => m.key === key) ?? null;
    }
  }
};
