import {
  shapeMetafields,
  type MetaData,
  type MetafieldResolverContext
} from '../../../../../lib/metafield/index.js';

type BlogPostParent = { metaData?: MetaData };

export default {
  BlogPost: {
    metafields: (
      post: BlogPostParent,
      { namespace }: { namespace?: string },
      { user, metafieldDefinitionCache }: MetafieldResolverContext
    ) =>
      shapeMetafields(post.metaData ?? {}, 'blog_post', {
        audience: user ? 'admin' : 'customer',
        namespace,
        cache: metafieldDefinitionCache
      }),
    metafield: async (
      post: BlogPostParent,
      { namespace, key }: { namespace: string; key: string },
      { user, metafieldDefinitionCache }: MetafieldResolverContext
    ) => {
      const all = await shapeMetafields(post.metaData ?? {}, 'blog_post', {
        audience: user ? 'admin' : 'customer',
        namespace,
        cache: metafieldDefinitionCache
      });
      return all.find((m) => m.key === key) ?? null;
    }
  }
};
