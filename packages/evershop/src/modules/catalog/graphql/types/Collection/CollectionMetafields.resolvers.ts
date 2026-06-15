import {
  shapeMetafields,
  type MetaData
} from '../../../../../lib/metafield/index.js';

type CollectionParent = { metaData?: MetaData; meta_data?: MetaData };

const metaOf = (collection: CollectionParent): MetaData =>
  collection.metaData ?? collection.meta_data ?? {};

export default {
  Collection: {
    metafields: (
      collection: CollectionParent,
      { namespace }: { namespace?: string },
      { user }: { user?: unknown }
    ) =>
      shapeMetafields(metaOf(collection), 'collection', {
        audience: user ? 'admin' : 'customer',
        namespace
      }),
    metafield: async (
      collection: CollectionParent,
      { namespace, key }: { namespace: string; key: string },
      { user }: { user?: unknown }
    ) => {
      const all = await shapeMetafields(metaOf(collection), 'collection', {
        audience: user ? 'admin' : 'customer',
        namespace
      });
      return all.find((m) => m.key === key) ?? null;
    }
  }
};
