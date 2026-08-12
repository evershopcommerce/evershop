import { select } from '@evershop/postgres-query-builder';
import { localizeUrl } from '../../../../../lib/locale/localeContext.js';
import { pool } from '../../../../../lib/postgres/connection.js';
import { camelCase } from '../../../../../lib/util/camelCase.js';
import { BlogPostCollection } from '../../../services/BlogPostCollection.js';
import { getBlogCategoriesBaseQuery } from '../../../services/getBlogCategoriesBaseQuery.js';
import { getPostsBaseQuery } from '../../../services/getPostsBaseQuery.js';
import { REACTION_TYPES } from '../../../services/reaction/reactionTypes.js';
import { readingTime } from '../../../services/readingTime.js';

export default {
  Query: {
    blogPost: async (_root: any, { id }: { id: string }, { pool: ctxPool }: any) => {
      const query = getPostsBaseQuery();
      query.where('blog_post.uuid', '=', id);
      const post = await query.load(ctxPool);
      return post ? camelCase(post) : null;
    },
    blogPosts: async (_root: any, { filters = [] }: any, { user }: any) => {
      const query = getPostsBaseQuery();
      const collection = new BlogPostCollection(query);
      await collection.init(filters, !!user);
      return collection;
    },
    currentBlogPost: async (
      _root: any,
      _args: any,
      { currentRoute, currentBlogPostId, pool: ctxPool }: any
    ) => {
      if (currentRoute?.id !== 'blogPostView' || !currentBlogPostId) {
        return null;
      }
      const query = getPostsBaseQuery();
      query.where('blog_post.blog_post_id', '=', currentBlogPostId);
      const post = await query.load(ctxPool);
      return post ? camelCase(post) : null;
    }
  },
  BlogPost: {
    url: async ({ uuid, urlKey }: any) => {
      const rewrite = await select()
        .from('url_rewrite')
        .where('entity_uuid', '=', uuid)
        .and('entity_type', '=', 'blog_post')
        .load(pool);
      return localizeUrl(rewrite ? rewrite.request_path : `/blog/${urlKey}`);
    },
    description: ({ description }: any) => {
      if (description == null) {
        return [];
      }
      try {
        return typeof description === 'string'
          ? JSON.parse(description)
          : description;
      } catch {
        return [];
      }
    },
    publishedAt: ({ publishedAt }: any) =>
      publishedAt ? new Date(publishedAt).toISOString() : null,
    readingTime: ({ readingTime: cached, description }: any) =>
      typeof cached === 'number' && cached > 0 ? cached : readingTime(description),
    commentCount: ({ commentCount }: any) => commentCount ?? 0,
    reactions: ({ reactionCounts }: any, _args: any, context: any) => {
      const counts = (reactionCounts || {}) as Record<string, number>;
      const reactedType = context?.blogPostReactedType;
      return REACTION_TYPES.map((type) => ({
        type,
        count: counts[type] ?? 0,
        reacted: type === reactedType
      }));
    },
    author: async ({ authorId }: any) => {
      if (!authorId) {
        return null;
      }
      const user = await select()
        .from('admin_user')
        .where('admin_user_id', '=', authorId)
        .load(pool);
      return user ? { fullName: user.full_name, email: user.email } : null;
    },
    category: async ({ categoryId }: any) => {
      if (!categoryId) {
        return null;
      }
      const query = getBlogCategoriesBaseQuery();
      query.where('blog_category.blog_category_id', '=', categoryId);
      const category = await query.load(pool);
      return category ? camelCase(category) : null;
    },
    tags: async ({ blogPostId }: any) => {
      const query = select().from('blog_tag');
      query
        .leftJoin('blog_post_tag')
        .on('blog_post_tag.tag_id', '=', 'blog_tag.blog_tag_id');
      query.where('blog_post_tag.post_id', '=', blogPostId);
      const rows = await query.execute(pool);
      return rows.map((row: Record<string, unknown>) => camelCase(row));
    },
    related: async ({ blogPostId, categoryId }: any, { limit = 3 }: any) => {
      // Published posts in the same category (excluding self), newest first.
      const query = getPostsBaseQuery();
      query.where('blog_post.status', '=', 1);
      query.andWhere('blog_post.blog_post_id', '<>', blogPostId);
      if (categoryId) {
        query.andWhere('blog_post.category_id', '=', categoryId);
      }
      query.orderBy('blog_post.published_at', 'DESC');
      query.limit(0, limit);
      const rows = await query.execute(pool);
      return rows.map((row: Record<string, unknown>) => camelCase(row));
    }
  }
};
