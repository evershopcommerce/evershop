import { localizeUrl } from '../../../../../lib/locale/localeContext.js';
import { pool } from '../../../../../lib/postgres/connection.js';
import { CmsUrn } from '../../../../../lib/urn/index.js';
import { getBaseUrl } from '../../../../../lib/util/getBaseUrl.js';
import { EvershopResponse } from '../../../../../types/response.js';
import { setPageMetaInfo } from '../../../../cms/services/pageMetaInfo.js';
import { setContextValue } from '../../../../graphql/services/contextHelper.js';
import { getCmsPagesBaseQuery } from '../../../services/getCmsPagesBaseQuery.js';

export default async (request, response: EvershopResponse, next) => {
  try {
    // The /page/<key> URL is retired in favor of the root-level /<key>. Only a
    // LITERAL /page/* request reaches this handler with a /page/ incoming path;
    // the url_rewrite'd /<key> request arrives with a /<key> path, so it is
    // never redirected (no loop). See wiki/cms-routing-redesign.md § 3.
    const incomingPath =
      request.localePath ?? request.originalUrl.split('?')[0];
    if (incomingPath.startsWith('/page/')) {
      return response.redirect(301, localizeUrl(`/${request.params.url_key}`));
    }

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
        description: page.meta_description || page.meta_title,
        // Both /<key> and (legacy) /page/<key> point at the same content —
        // emit a canonical to the root-level URL. Required (wiki § guards).
        canonicalUrl: getBaseUrl() + localizeUrl(`/${request.params.url_key}`)
      });
      next();
    }
  } catch (e) {
    next(e);
  }
};
