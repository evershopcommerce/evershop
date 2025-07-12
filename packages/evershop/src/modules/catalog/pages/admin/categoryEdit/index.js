import { select } from '@evershop/postgres-query-builder';
import { pool } from '../../../../../lib/postgres/connection.js';
import { setContextValue } from '../../../../graphql/services/contextHelper.js';

export default async (request, response, next) => {
  try {
    const query = select();
    query.from('category');
    query.andWhere('category.uuid', '=', request.params.id);
    query
      .leftJoin('category_description')
      .on(
        'category_description.category_description_category_id',
        '=',
        'category.category_id'
      );

    const category = await query.load(pool);

    if (category === null) {
      response.status(404);
      next();
    } else {
      setContextValue(request, 'categoryId', category.category_id);
      setContextValue(request, 'categoryUuid', category.uuid);
      setContextValue(request, 'pageInfo', {
        title: category.name,
        description: category.meta_description || category.short_description
      });
      next();
    }
  } catch (e) {
    next(e);
  }
};
