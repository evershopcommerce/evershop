import { select, type SelectQuery } from '@evershop/postgres-query-builder';

export const getBlogTagsBaseQuery = (): SelectQuery => {
  return select().from('blog_tag');
};
