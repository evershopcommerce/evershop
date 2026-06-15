import {
  shapeMetafields,
  type MetaData
} from '../../../../../lib/metafield/index.js';

type OrderParent = { metaData?: MetaData; meta_data?: MetaData };

const metaOf = (order: OrderParent): MetaData =>
  order.metaData ?? order.meta_data ?? {};

export default {
  Order: {
    metafields: (
      order: OrderParent,
      { namespace }: { namespace?: string },
      { user }: { user?: unknown }
    ) =>
      shapeMetafields(metaOf(order), 'order', {
        audience: user ? 'admin' : 'customer',
        namespace
      }),
    metafield: async (
      order: OrderParent,
      { namespace, key }: { namespace: string; key: string },
      { user }: { user?: unknown }
    ) => {
      const all = await shapeMetafields(metaOf(order), 'order', {
        audience: user ? 'admin' : 'customer',
        namespace
      });
      return all.find((m) => m.key === key) ?? null;
    }
  }
};
