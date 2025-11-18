import { select, SelectQuery } from '@evershop/postgres-query-builder';

export const getCategoriesBaseQuery = (): SelectQuery => {
  const query = select().from('category');
  query
    .leftJoin('category_description')
    .on(
      'category_description.category_description_category_id',
      '=',
      'category.category_id'
    );

  return query;
};
