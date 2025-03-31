import { select } from '@evershop/postgres-query-builder';

export const getCmsPagesBaseQuery = () => {
  const query = select().from('cms_page');
  query
    .leftJoin('cms_page_description')
    .on(
      'cms_page.cms_page_id',
      '=',
      'cms_page_description.cms_page_description_cms_page_id'
    );

  return query;
};
