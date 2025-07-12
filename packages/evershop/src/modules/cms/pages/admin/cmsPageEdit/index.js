import { select } from '@evershop/postgres-query-builder';
import { pool } from '../../../../../lib/postgres/connection.js';
import { setContextValue } from '../../../../graphql/services/contextHelper.js';

export default async (request, response, next) => {
  try {
    const query = select();
    query.from('cms_page');
    query.andWhere('cms_page.uuid', '=', request.params.id);
    query
      .leftJoin('cms_page_description')
      .on(
        'cms_page_description.cms_page_description_cms_page_id',
        '=',
        'cms_page.cms_page_id'
      );

    const cmsPage = await query.load(pool);

    if (cmsPage === null) {
      response.status(404);
      next();
    } else {
      setContextValue(request, 'cmsPageId', cmsPage.cms_page_id);
      setContextValue(request, 'cmsPageUuid', cmsPage.uuid);
      setContextValue(request, 'pageInfo', {
        title: cmsPage.name,
        description: cmsPage.name
      });
      next();
    }
  } catch (e) {
    next(e);
  }
};
