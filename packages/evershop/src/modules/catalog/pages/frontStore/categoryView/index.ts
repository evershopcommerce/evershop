import { select } from '@evershop/postgres-query-builder';
import { pool } from '../../../../../lib/postgres/connection.js';
import { getImageUrl } from '../../../../../lib/util/getImageUrl.js';
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
        // `category.image` (a relative path for local storage, a full URL for
        // cloud storage) goes as it is to the `/images` endpoint; only the
        // endpoint URL is absolute, as social crawlers require.
        setPageMetaInfo(request, {
          ogInfo: {
            image: getImageUrl(category.image, {
              width: 1200,
              quality: 80,
              height: 675,
              format: 'png'
            })
          }
        });
      }
      next();
    }
  } catch (e) {
    next(e);
  }
};
