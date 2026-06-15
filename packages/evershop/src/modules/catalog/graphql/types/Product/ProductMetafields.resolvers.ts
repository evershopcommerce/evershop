import {
  shapeMetafields,
  type MetaData
} from '../../../../../lib/metafield/index.js';

type ProductParent = { metaData?: MetaData };

export default {
  Product: {
    metafields: (
      product: ProductParent,
      { namespace }: { namespace?: string },
      { user }: { user?: unknown }
    ) =>
      shapeMetafields(product.metaData ?? {}, 'product', {
        audience: user ? 'admin' : 'customer',
        namespace
      }),
    metafield: async (
      product: ProductParent,
      { namespace, key }: { namespace: string; key: string },
      { user }: { user?: unknown }
    ) => {
      const all = await shapeMetafields(product.metaData ?? {}, 'product', {
        audience: user ? 'admin' : 'customer',
        namespace
      });
      return all.find((m) => m.key === key) ?? null;
    }
  }
};
