import { select } from '@evershop/postgres-query-builder';
import { localizeUrl } from '../../../../../lib/locale/localeContext.js';
import { pool } from '../../../../../lib/postgres/connection.js';
import { PromotionUrn } from '../../../../../lib/urn/index.js';
import { getBaseUrl } from '../../../../../lib/util/getBaseUrl.js';
import { EvershopResponse } from '../../../../../types/response.js';
import { setPageMetaInfo } from '../../../../cms/services/pageMetaInfo.js';
import { setContextValue } from '../../../../graphql/services/contextHelper.js';
import { isValidPreviewToken } from '../../../../pageBuilder/services/isValidPreviewToken.js';

/**
 * A landing page is live only when published AND inside its schedule window
 * (either bound nullable). Computed here rather than via a cron — an out-of-
 * window page 404s exactly like a draft. See wiki/landing-pages.md.
 */
function isWithinSchedule(lp: {
  publish_start?: Date | string | null;
  publish_end?: Date | string | null;
}): boolean {
  const now = Date.now();
  if (lp.publish_start && new Date(lp.publish_start).getTime() > now) {
    return false;
  }
  if (lp.publish_end && new Date(lp.publish_end).getTime() <= now) {
    return false;
  }
  return true;
}

export default async (request, response: EvershopResponse, next) => {
  try {
    // The internal /landing/<key> URL is not the public one — landing pages
    // live at root-level /<key> (served via url_rewrite → this route). A
    // LITERAL /landing/* request 301s to the root path; the url_rewrite'd
    // /<key> request arrives with a /<key> incoming path, so it never loops.
    const incomingPath =
      request.localePath ?? request.originalUrl.split('?')[0];
    if (incomingPath.startsWith('/landing/')) {
      return response.redirect(301, localizeUrl(`/${request.params.url_key}`));
    }

    // Load WITHOUT the status filter so an unpublished page can still be
    // previewed in the page builder (below); public liveness is decided next.
    const landingPage = await select()
      .from('landing_page')
      .where('url_key', '=', request.params.url_key)
      .load(pool);

    // Publicly live = published AND inside its schedule window. A draft or an
    // out-of-window page is NOT live — but the page-builder iframe loads the
    // page's real URL with a `?changeset=<token>`, and a valid token authorizes
    // previewing it anyway (possession-based trust, same as the widget overlay).
    // Without this bypass "build the campaign page before its publish_start" —
    // the whole point of a scheduled entity — renders a 404 in the canvas.
    const isLive =
      !!landingPage &&
      landingPage.status === true &&
      isWithinSchedule(landingPage);
    const isPreview =
      !!landingPage &&
      !isLive &&
      (await isValidPreviewToken(
        request.query?.changeset ? String(request.query.changeset) : null
      ));

    if (!landingPage || (!isLive && !isPreview)) {
      response.status(404);
      next();
    } else {
      setContextValue(request, 'landingPageId', landingPage.landing_page_id);
      // Entity URN for the page-builder loader so this landing page's entity-
      // scoped widget placements render (the body is entirely widgets).
      request.locals = request.locals ?? {};
      request.locals.pageBuilderEntityUrn = PromotionUrn.landingPage(
        landingPage.uuid
      );
      setPageMetaInfo(request, {
        title: landingPage.meta_title || landingPage.name,
        description:
          landingPage.meta_description ||
          landingPage.description ||
          landingPage.meta_title,
        canonicalUrl:
          getBaseUrl() + localizeUrl(`/${request.params.url_key}`)
      });
      next();
    }
  } catch (e) {
    next(e);
  }
};
