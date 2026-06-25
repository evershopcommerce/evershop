import { select } from '@evershop/postgres-query-builder';
import { pool } from '../../../../../lib/postgres/connection.js';
import { EvershopResponse } from '../../../../../types/response.js';
import { setPageMetaInfo } from '../../../../cms/services/pageMetaInfo.js';
import { setContextValue } from '../../../../graphql/services/contextHelper.js';

export default async (request, response: EvershopResponse, next) => {
  try {
    const tag = await select()
      .from('blog_tag')
      .where('blog_tag.uuid', '=', request.params.id)
      .load(pool);

    if (tag === null) {
      response.status(404);
      next();
    } else {
      setContextValue(request, 'blogTagId', tag.blog_tag_id);
      setContextValue(request, 'blogTagUuid', tag.uuid);
      setPageMetaInfo(request, {
        title: tag.name,
        description: tag.name
      });
      next();
    }
  } catch (e) {
    next(e);
  }
};
