import {
  shapeMetafields,
  type MetaData
} from '../../../../../lib/metafield/index.js';

type CollectionParent = { metaData?: MetaData };

export default {
  Collection: {
    metafields: (
      collection: CollectionParent,
      { namespace }: { namespace?: string },
      { user }: { user?: unknown }
    ) =>
      shapeMetafields(collection.metaData ?? {}, 'collection', {
        audience: user ? 'admin' : 'customer',
        namespace
      }),
    metafield: async (
      collection: CollectionParent,
      { namespace, key }: { namespace: string; key: string },
      { user }: { user?: unknown }
    ) => {
      const all = await shapeMetafields(collection.metaData ?? {}, 'collection', {
        audience: user ? 'admin' : 'customer',
        namespace
      });
      return all.find((m) => m.key === key) ?? null;
    }
  }
};
