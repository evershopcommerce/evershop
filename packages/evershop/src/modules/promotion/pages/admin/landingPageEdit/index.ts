import { select } from '@evershop/postgres-query-builder';
import { pool } from '../../../../../lib/postgres/connection.js';
import { buildUrl } from '../../../../../lib/router/buildUrl.js';
import { EvershopResponse } from '../../../../../types/response.js';
import { setPageMetaInfo } from '../../../../cms/services/pageMetaInfo.js';
import { setContextValue } from '../../../../graphql/services/contextHelper.js';

export default async (request, response: EvershopResponse, next) => {
  try {
    const query = select();
    query.from('landing_page');
    query.andWhere('landing_page.uuid', '=', request.params.id);
    const landingPage = await query.load(pool);

    if (landingPage === null) {
      response.redirect(302, buildUrl('landingPageGrid'));
    } else {
      setContextValue(
        request,
        'landingPageId',
        parseInt(landingPage.landing_page_id, 10)
      );
      setContextValue(request, 'landingPageUuid', landingPage.uuid);
      setPageMetaInfo(request, {
        title: landingPage.name,
        description: landingPage.name
      });
      next();
    }
  } catch (e) {
    next(e);
  }
};
