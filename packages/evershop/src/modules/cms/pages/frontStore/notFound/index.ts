import { translate } from '../../../../../lib/locale/translate/translate.js';
import { EvershopResponse } from '../../../../../types/response.js';
import { setPageMetaInfo } from '../../../../cms/services/pageMetaInfo.js';

/**
 * A direct visit to `/notfound` matches this route (status 200), so the global
 * `[auth]notFound[response]` middleware — which only fires on a 404 status —
 * never sets the page title. Without it the breadcrumb's last crumb renders
 * empty. Set the same title the global middleware uses so both the direct route
 * and the catch-all 404 read identically.
 */
export default (request, response: EvershopResponse, next) => {
  setPageMetaInfo(request, {
    title: translate('Not found'),
    description: translate('Page not found')
  });
  next();
};
