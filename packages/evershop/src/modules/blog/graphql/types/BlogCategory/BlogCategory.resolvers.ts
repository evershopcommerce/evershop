import { select } from '@evershop/postgres-query-builder';
import { localizeUrl } from '../../../../../lib/locale/localeContext.js';
import { pool } from '../../../../../lib/postgres/connection.js';
import { camelCase } from '../../../../../lib/util/camelCase.js';
import { BlogCategoryCollection } from '../../../services/BlogCategoryCollection.js';
import { BlogPostCollection } from '../../../services/BlogPostCollection.js';
import { getBlogCategoriesBaseQuery } from '../../../services/getBlogCategoriesBaseQuery.js';
import { getPostsBaseQuery } from '../../../services/getPostsBaseQuery.js';

export default {
  Query: {
    blogCategory: async (_root: any, { id }: { id: string }, { pool: ctxPool }: any) => {
      const query = getBlogCategoriesBaseQuery();
      query.where('blog_category.uuid', '=', id);
      const category = await query.load(ctxPool);
      return category ? camelCase(category) : null;
    },
    blogCategories: async (_root: any, { filters = [] }: any, { user }: any) => {
      const query = getBlogCategoriesBaseQuery();
      const collection = new BlogCategoryCollection(query);
      await collection.init(filters, !!user);
      return collection;
    },
    currentBlogCategory: async (
      _root: any,
      _args: any,
      { currentRoute, currentBlogCategoryId, pool: ctxPool }: any
    ) => {
      if (currentRoute?.id !== 'blogCategoryView' || !currentBlogCategoryId) {
        return null;
      }
      const query = getBlogCategoriesBaseQuery();
      query.where('blog_category.blog_category_id', '=', currentBlogCategoryId);
      const category = await query.load(ctxPool);
      return category ? camelCase(category) : null;
    }
  },
  BlogCategory: {
    url: async ({ uuid, urlKey }: any) => {
      const rewrite = await select()
        .from('url_rewrite')
        .where('entity_uuid', '=', uuid)
        .and('entity_type', '=', 'blog_category')
        .load(pool);
      return localizeUrl(
        rewrite ? rewrite.request_path : `/blog/category/${urlKey}`
      );
    },
    posts: async ({ blogCategoryId }: any, { filters = [] }: any, { user }: any) => {
      const query = getPostsBaseQuery();
      query.andWhere('blog_post.category_id', '=', blogCategoryId);
      const collection = new BlogPostCollection(query);
      await collection.init(filters, !!user);
      return collection;
    }
  }
};
