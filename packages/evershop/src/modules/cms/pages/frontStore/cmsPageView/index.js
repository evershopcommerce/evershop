import { pool } from '../../../../../lib/postgres/connection.js';
import { setContextValue } from '../../../../graphql/services/contextHelper.js';
import { getCmsPagesBaseQuery } from '../../../services/getCmsPagesBaseQuery.js';

export default async (request, response, next) => {
  try {
    const query = getCmsPagesBaseQuery();
    query
      .where('cms_page_description.url_key', '=', request.params.url_key)
      .and('cms_page.status', '=', 1);
    const page = await query.load(pool);
    if (page === null) {
      response.status(404);
      next();
    } else {
      setContextValue(request, 'pageId', page.cms_page_id);
      setContextValue(request, 'pageInfo', {
        title: page.meta_title || page.name,
        description: page.meta_description || page.meta_title,
        url: request.url
      });
      next();
    }
  } catch (e) {
    next(e);
  }
};
