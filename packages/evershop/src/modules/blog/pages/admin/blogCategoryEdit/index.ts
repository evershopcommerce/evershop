import { select } from '@evershop/postgres-query-builder';
import { pool } from '../../../../../lib/postgres/connection.js';
import { EvershopResponse } from '../../../../../types/response.js';
import { setPageMetaInfo } from '../../../../cms/services/pageMetaInfo.js';
import { setContextValue } from '../../../../graphql/services/contextHelper.js';

export default async (request, response: EvershopResponse, next) => {
  try {
    const query = select().from('blog_category');
    query.andWhere('blog_category.uuid', '=', request.params.id);
    query
      .leftJoin('blog_category_description')
      .on(
        'blog_category_description.blog_category_description_blog_category_id',
        '=',
        'blog_category.blog_category_id'
      );

    const category = await query.load(pool);

    if (category === null) {
      response.status(404);
      next();
    } else {
      setContextValue(request, 'blogCategoryId', category.blog_category_id);
      setContextValue(request, 'blogCategoryUuid', category.uuid);
      setPageMetaInfo(request, {
        title: category.name,
        description: category.name
      });
      next();
    }
  } catch (e) {
    next(e);
  }
};
