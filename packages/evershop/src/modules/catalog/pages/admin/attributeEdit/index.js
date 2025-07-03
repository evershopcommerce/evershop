import { select } from '@evershop/postgres-query-builder';
import { pool } from '../../../../../lib/postgres/connection.js';
import { setContextValue } from '../../../../graphql/services/contextHelper.js';

export default async (request, response, next) => {
  try {
    const query = select();
    query.from('attribute');
    query.andWhere('attribute.uuid', '=', request.params.id);
    const attribute = await query.load(pool);

    if (attribute === null) {
      response.status(404);
      next();
    } else {
      setContextValue(request, 'attributeId', attribute.attribute_id);
      setContextValue(request, 'attributeUuid', attribute.uuid);
      setContextValue(request, 'pageInfo', {
        title: attribute.attribute_name,
        description: attribute.attribute_name
      });
      next();
    }
  } catch (e) {
    next(e);
  }
};
