import { select, type SelectQuery } from '@evershop/postgres-query-builder';

export const getBlogCategoriesBaseQuery = (): SelectQuery => {
  const query = select().from('blog_category');
  query
    .leftJoin('blog_category_description')
    .on(
      'blog_category.blog_category_id',
      '=',
      'blog_category_description.blog_category_description_blog_category_id'
    );
  return query;
};
