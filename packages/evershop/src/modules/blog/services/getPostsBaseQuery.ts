import { select, type SelectQuery } from '@evershop/postgres-query-builder';

/**
 * Base SELECT joining blog_post ⋈ blog_post_description. Callers add filters,
 * status/visibility, and paging on top.
 */
export const getPostsBaseQuery = (): SelectQuery => {
  const query = select().from('blog_post');
  query
    .leftJoin('blog_post_description')
    .on(
      'blog_post.blog_post_id',
      '=',
      'blog_post_description.blog_post_description_blog_post_id'
    );
  return query;
};
