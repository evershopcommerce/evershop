import { select } from '@evershop/postgres-query-builder';
import { pool } from '../../../../../lib/postgres/connection.js';
import { setContextValue } from '../../../../graphql/services/contextHelper.js';

export default async (request, response, next) => {
  try {
    const query = select();
    query.from('collection');
    query.andWhere('collection.uuid', '=', request.params.id);
    const collection = await query.load(pool);
    if (collection === null) {
      response.status(404);
      next();
    } else {
      setContextValue(request, 'collectionCode', collection.code);
      setContextValue(request, 'collectionUuid', collection.uuid);
      setContextValue(request, 'pageInfo', {
        title: collection.name,
        description: collection.description
      });
      next();
    }
  } catch (e) {
    next(e);
  }
};
