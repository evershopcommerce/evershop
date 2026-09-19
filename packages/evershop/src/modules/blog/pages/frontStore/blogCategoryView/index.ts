import { select } from '@evershop/postgres-query-builder';
import { localizeUrl } from '../../../../../lib/locale/localeContext.js';
import { pool } from '../../../../../lib/postgres/connection.js';
import { buildFilterFromUrl } from '../../../../../lib/util/buildFilterFromUrl.js';
import { setPageMetaInfo } from '../../../../cms/services/pageMetaInfo.js';
import { setContextValue } from '../../../../graphql/services/contextHelper.js';
import { BlogUrn } from '../../../lib/BlogUrn.js';

export default async (request, response, next) => {
  try {
    const query = select().from('blog_category');
    query
      .leftJoin('blog_category_description')
      .on(
        'blog_category.blog_category_id',
        '=',
        'blog_category_description.blog_category_description_blog_category_id'
      );
    query
      .where('blog_category.uuid', '=', request.params.uuid)
      .and('blog_category.status', '=', 1);
    const category = await query.load(pool);

    if (category === null) {
      response.status(404);
      next();
    } else {
      setContextValue(
        request,
        'currentBlogCategoryId',
        category.blog_category_id
      );
      request.locals = request.locals ?? {};
      request.locals.pageBuilderEntityUrn = BlogUrn.category(category.uuid);
      setContextValue(
        request,
        'filtersFromUrl',
        buildFilterFromUrl(request.originalUrl)
      );
      setPageMetaInfo(request, {
        title: category.meta_title || category.name,
        description:
          category.meta_description ||
          category.short_description ||
          category.name,
        breadcrumbs: [
          { title: 'Home', url: localizeUrl('/') },
          { title: 'Blog', url: localizeUrl('/blog') },
          {
            title: category.name,
            url: localizeUrl(`/blog/category/${category.url_key}`)
          }
        ]
      });
      next();
    }
  } catch (e) {
    next(e);
  }
};
