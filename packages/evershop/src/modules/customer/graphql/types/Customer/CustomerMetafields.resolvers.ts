import {
  shapeMetafields,
  type MetaData,
  type MetafieldResolverContext
} from '../../../../../lib/metafield/index.js';

type CustomerParent = { metaData?: MetaData };

export default {
  Customer: {
    metafields: (
      customer: CustomerParent,
      { namespace }: { namespace?: string },
      { user, metafieldDefinitionCache }: MetafieldResolverContext
    ) =>
      shapeMetafields(customer.metaData ?? {}, 'customer', {
        audience: user ? 'admin' : 'customer',
        namespace,
        cache: metafieldDefinitionCache
      }),
    metafield: async (
      customer: CustomerParent,
      { namespace, key }: { namespace: string; key: string },
      { user, metafieldDefinitionCache }: MetafieldResolverContext
    ) => {
      const all = await shapeMetafields(customer.metaData ?? {}, 'customer', {
        audience: user ? 'admin' : 'customer',
        namespace,
        cache: metafieldDefinitionCache
      });
      return all.find((m) => m.key === key) ?? null;
    }
  }
};
