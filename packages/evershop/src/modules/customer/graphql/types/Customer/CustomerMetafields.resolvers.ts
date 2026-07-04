import {
  shapeMetafields,
  type MetaData
} from '../../../../../lib/metafield/index.js';

type CustomerParent = { metaData?: MetaData };

export default {
  Customer: {
    metafields: (
      customer: CustomerParent,
      { namespace }: { namespace?: string },
      { user }: { user?: unknown }
    ) =>
      shapeMetafields(customer.metaData ?? {}, 'customer', {
        audience: user ? 'admin' : 'customer',
        namespace
      }),
    metafield: async (
      customer: CustomerParent,
      { namespace, key }: { namespace: string; key: string },
      { user }: { user?: unknown }
    ) => {
      const all = await shapeMetafields(customer.metaData ?? {}, 'customer', {
        audience: user ? 'admin' : 'customer',
        namespace
      });
      return all.find((m) => m.key === key) ?? null;
    }
  }
};
