import { select } from '@evershop/postgres-query-builder';
import { pool } from '../../../../../lib/postgres/connection.js';
import { buildFilterFromUrl } from '../../../../../lib/util/buildFilterFromUrl.js';
import { EvershopResponse } from '../../../../../types/response.js';
import { setPageMetaInfo } from '../../../../cms/services/pageMetaInfo.js';
import { setContextValue } from '../../../../graphql/services/contextHelper.js';

export default async (request, response: EvershopResponse, next) => {
  try {
    const webhook = await select()
      .from('webhook')
      .where('uuid', '=', request.params.id)
      .load(pool);

    if (webhook === null) {
      response.status(404);
      next();
    } else {
      setContextValue(request, 'webhookId', webhook.webhook_id);
      setContextValue(request, 'webhookUuid', webhook.uuid);
      // The delivery list pages and filters through the URL.
      setContextValue(
        request,
        'filtersFromUrl',
        buildFilterFromUrl(request.originalUrl)
      );
      setPageMetaInfo(request, {
        title: webhook.name,
        description: webhook.name
      });
      next();
    }
  } catch (e) {
    next(e);
  }
};
