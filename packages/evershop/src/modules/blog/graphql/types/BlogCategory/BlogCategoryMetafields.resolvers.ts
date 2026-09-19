import {
  shapeMetafields,
  type MetaData,
  type MetafieldResolverContext
} from '../../../../../lib/metafield/index.js';

type BlogCategoryParent = { metaData?: MetaData };

export default {
  BlogCategory: {
    metafields: (
      category: BlogCategoryParent,
      { namespace }: { namespace?: string },
      { user, metafieldDefinitionCache }: MetafieldResolverContext
    ) =>
      shapeMetafields(category.metaData ?? {}, 'blog_category', {
        audience: user ? 'admin' : 'customer',
        namespace,
        cache: metafieldDefinitionCache
      }),
    metafield: async (
      category: BlogCategoryParent,
      { namespace, key }: { namespace: string; key: string },
      { user, metafieldDefinitionCache }: MetafieldResolverContext
    ) => {
      const all = await shapeMetafields(category.metaData ?? {}, 'blog_category', {
        audience: user ? 'admin' : 'customer',
        namespace,
        cache: metafieldDefinitionCache
      });
      return all.find((m) => m.key === key) ?? null;
    }
  }
};
