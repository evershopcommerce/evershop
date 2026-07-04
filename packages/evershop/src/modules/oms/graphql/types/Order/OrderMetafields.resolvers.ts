import {
  shapeMetafields,
  type MetaData
} from '../../../../../lib/metafield/index.js';

type OrderParent = { metaData?: MetaData };

export default {
  Order: {
    metafields: (
      order: OrderParent,
      { namespace }: { namespace?: string },
      { user }: { user?: unknown }
    ) =>
      shapeMetafields(order.metaData ?? {}, 'order', {
        audience: user ? 'admin' : 'customer',
        namespace
      }),
    metafield: async (
      order: OrderParent,
      { namespace, key }: { namespace: string; key: string },
      { user }: { user?: unknown }
    ) => {
      const all = await shapeMetafields(order.metaData ?? {}, 'order', {
        audience: user ? 'admin' : 'customer',
        namespace
      });
      return all.find((m) => m.key === key) ?? null;
    }
  }
};
