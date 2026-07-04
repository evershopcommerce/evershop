import {
  shapeMetafields,
  type MetaData
} from '../../../../../lib/metafield/index.js';

type CategoryParent = { metaData?: MetaData };

export default {
  Category: {
    metafields: (
      category: CategoryParent,
      { namespace }: { namespace?: string },
      { user }: { user?: unknown }
    ) =>
      shapeMetafields(category.metaData ?? {}, 'category', {
        audience: user ? 'admin' : 'customer',
        namespace
      }),
    metafield: async (
      category: CategoryParent,
      { namespace, key }: { namespace: string; key: string },
      { user }: { user?: unknown }
    ) => {
      const all = await shapeMetafields(category.metaData ?? {}, 'category', {
        audience: user ? 'admin' : 'customer',
        namespace
      });
      return all.find((m) => m.key === key) ?? null;
    }
  }
};
