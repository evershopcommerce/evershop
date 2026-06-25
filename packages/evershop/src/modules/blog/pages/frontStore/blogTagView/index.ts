import { select } from '@evershop/postgres-query-builder';
import { localizeUrl } from '../../../../../lib/locale/localeContext.js';
import { pool } from '../../../../../lib/postgres/connection.js';
import { buildFilterFromUrl } from '../../../../../lib/util/buildFilterFromUrl.js';
import { setPageMetaInfo } from '../../../../cms/services/pageMetaInfo.js';
import { setContextValue } from '../../../../graphql/services/contextHelper.js';
import { BlogUrn } from '../../../lib/BlogUrn.js';

export default async (request, response, next) => {
  try {
    const tag = await select()
      .from('blog_tag')
      .where('blog_tag.uuid', '=', request.params.uuid)
      .load(pool);

    if (tag === null) {
      response.status(404);
      next();
    } else {
      setContextValue(request, 'currentBlogTagId', tag.blog_tag_id);
      request.locals = request.locals ?? {};
      request.locals.pageBuilderEntityUrn = BlogUrn.tag(tag.uuid);
      setContextValue(
        request,
        'filtersFromUrl',
        buildFilterFromUrl(request.originalUrl)
      );
      setPageMetaInfo(request, {
        title: tag.meta_title || tag.name,
        description: tag.meta_description || `Posts tagged ${tag.name}`,
        breadcrumbs: [
          { title: 'Home', url: localizeUrl('/') },
          { title: 'Blog', url: localizeUrl('/blog') },
          { title: tag.name, url: localizeUrl(`/blog/tag/${tag.url_key}`) }
        ]
      });
      next();
    }
  } catch (e) {
    next(e);
  }
};
