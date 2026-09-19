import { select } from '@evershop/postgres-query-builder';
import { localizeUrl } from '../../../../../lib/locale/localeContext.js';
import { pool } from '../../../../../lib/postgres/connection.js';
import { camelCase } from '../../../../../lib/util/camelCase.js';
import { BlogPostCollection } from '../../../services/BlogPostCollection.js';
import { BlogTagCollection } from '../../../services/BlogTagCollection.js';
import { getBlogTagsBaseQuery } from '../../../services/getBlogTagsBaseQuery.js';
import { getPostsBaseQuery } from '../../../services/getPostsBaseQuery.js';

export default {
  Query: {
    blogTag: async (_root: any, { id }: { id: string }, { pool: ctxPool }: any) => {
      const query = getBlogTagsBaseQuery();
      query.where('blog_tag.uuid', '=', id);
      const tag = await query.load(ctxPool);
      return tag ? camelCase(tag) : null;
    },
    blogTags: async (_root: any, { filters = [] }: any) => {
      const query = getBlogTagsBaseQuery();
      const collection = new BlogTagCollection(query);
      await collection.init(filters);
      return collection;
    },
    currentBlogTag: async (
      _root: any,
      _args: any,
      { currentRoute, currentBlogTagId, pool: ctxPool }: any
    ) => {
      if (currentRoute?.id !== 'blogTagView' || !currentBlogTagId) {
        return null;
      }
      const query = getBlogTagsBaseQuery();
      query.where('blog_tag.blog_tag_id', '=', currentBlogTagId);
      const tag = await query.load(ctxPool);
      return tag ? camelCase(tag) : null;
    }
  },
  BlogTag: {
    url: async ({ uuid, urlKey }: any) => {
      const rewrite = await select()
        .from('url_rewrite')
        .where('entity_uuid', '=', uuid)
        .and('entity_type', '=', 'blog_tag')
        .load(pool);
      return localizeUrl(rewrite ? rewrite.request_path : `/blog/tag/${urlKey}`);
    },
    posts: async ({ blogTagId }: any, { filters = [] }: any, { user }: any) => {
      const query = getPostsBaseQuery();
      query
        .leftJoin('blog_post_tag')
        .on('blog_post_tag.post_id', '=', 'blog_post.blog_post_id');
      query.andWhere('blog_post_tag.tag_id', '=', blogTagId);
      const collection = new BlogPostCollection(query);
      await collection.init(filters, !!user);
      return collection;
    }
  }
};
