import {
  shapeMetafields,
  type MetaData
} from '../../../../../lib/metafield/index.js';

type CustomerParent = { metaData?: MetaData; meta_data?: MetaData };

const metaOf = (customer: CustomerParent): MetaData =>
  customer.metaData ?? customer.meta_data ?? {};

export default {
  Customer: {
    metafields: (
      customer: CustomerParent,
      { namespace }: { namespace?: string },
      { user }: { user?: unknown }
    ) =>
      shapeMetafields(metaOf(customer), 'customer', {
        audience: user ? 'admin' : 'customer',
        namespace
      }),
    metafield: async (
      customer: CustomerParent,
      { namespace, key }: { namespace: string; key: string },
      { user }: { user?: unknown }
    ) => {
      const all = await shapeMetafields(metaOf(customer), 'customer', {
        audience: user ? 'admin' : 'customer',
        namespace
      });
      return all.find((m) => m.key === key) ?? null;
    }
  }
};
