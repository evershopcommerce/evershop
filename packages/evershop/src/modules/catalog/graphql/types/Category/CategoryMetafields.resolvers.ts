import {
  shapeMetafields,
  type MetaData
} from '../../../../../lib/metafield/index.js';

type CategoryParent = { metaData?: MetaData; meta_data?: MetaData };

const metaOf = (category: CategoryParent): MetaData =>
  category.metaData ?? category.meta_data ?? {};

export default {
  Category: {
    metafields: (
      category: CategoryParent,
      { namespace }: { namespace?: string },
      { user }: { user?: unknown }
    ) =>
      shapeMetafields(metaOf(category), 'category', {
        audience: user ? 'admin' : 'customer',
        namespace
      }),
    metafield: async (
      category: CategoryParent,
      { namespace, key }: { namespace: string; key: string },
      { user }: { user?: unknown }
    ) => {
      const all = await shapeMetafields(metaOf(category), 'category', {
        audience: user ? 'admin' : 'customer',
        namespace
      });
      return all.find((m) => m.key === key) ?? null;
    }
  }
};
