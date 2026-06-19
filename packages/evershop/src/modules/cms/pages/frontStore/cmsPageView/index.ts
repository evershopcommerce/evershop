import { pool } from '../../../../../lib/postgres/connection.js';
import { CmsUrn } from '../../../../../lib/urn/index.js';
import { EvershopResponse } from '../../../../../types/response.js';
import { setPageMetaInfo } from '../../../../cms/services/pageMetaInfo.js';
import { setContextValue } from '../../../../graphql/services/contextHelper.js';
import { getCmsPagesBaseQuery } from '../../../services/getCmsPagesBaseQuery.js';

export default async (request, response: EvershopResponse, next) => {
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
      // Entity URN for the page-builder loader so entity-level placements
      // (those scoped to this specific page) render alongside route-level
      // ones. See spec 03 § 3.2.
      request.locals = request.locals ?? {};
      request.locals.pageBuilderEntityUrn = CmsUrn.page(page.uuid);
      setPageMetaInfo(request, {
        title: page.meta_title || page.name,
        description: page.meta_description || page.meta_title
      });
      next();
    }
  } catch (e) {
    next(e);
  }
};
