import { select } from '@evershop/postgres-query-builder';
import { pool } from '../../../../../lib/postgres/connection.js';
import { getBaseUrl } from '../../../../../lib/util/getBaseUrl.js';
import { setPageMetaInfo } from '../../../../cms/services/pageMetaInfo.js';
import { setContextValue } from '../../../../graphql/services/contextHelper.js';

export default async (request, response, next) => {
  try {
    const query = select();
    query
      .from('category')
      .leftJoin('category_description')
      .on(
        'category.category_id',
        '=',
        'category_description.category_description_category_id'
      );

    query.where('category.uuid', '=', request.params.uuid);
    const category = await query.load(pool);
    if (category === null) {
      response.status(404);
      next();
    } else {
      setContextValue(request, 'categoryId', category.category_id);
      setPageMetaInfo(request, {
        title: category.meta_title || category.name,
        description: category.meta_description || category.short_description
      });

      if (category.image) {
        const baseUrl = getBaseUrl();
        setPageMetaInfo(request, {
          ogInfo: {
            image: `${baseUrl}/images?src=${category.image}&w=1200&q=80&h=675&f=png`
          }
        });
      }
      next();
    }
  } catch (e) {
    next(e);
  }
};
