import { select, type SelectQuery } from '@evershop/postgres-query-builder';

export const getBlogCommentsBaseQuery = (): SelectQuery => {
  const query = select().from('blog_comment');
  query
    .leftJoin('blog_post_description')
    .on(
      'blog_post_description.blog_post_description_blog_post_id',
      '=',
      'blog_comment.post_id'
    );
  query.select('blog_comment.blog_comment_id');
  query.select('blog_comment.uuid');
  query.select('blog_comment.post_id');
  query.select('blog_comment.name');
  query.select('blog_comment.email');
  query.select('blog_comment.comment');
  query.select('blog_comment.status');
  query.select('blog_comment.like_count');
  query.select('blog_comment.created_at');
  query.select('blog_post_description.name', 'post_name');
  return query;
};
