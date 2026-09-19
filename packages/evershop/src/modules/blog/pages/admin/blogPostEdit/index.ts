import { select } from '@evershop/postgres-query-builder';
import { pool } from '../../../../../lib/postgres/connection.js';
import { EvershopResponse } from '../../../../../types/response.js';
import { setPageMetaInfo } from '../../../../cms/services/pageMetaInfo.js';
import { setContextValue } from '../../../../graphql/services/contextHelper.js';

export default async (request, response: EvershopResponse, next) => {
  try {
    const query = select().from('blog_post');
    query.andWhere('blog_post.uuid', '=', request.params.id);
    query
      .leftJoin('blog_post_description')
      .on(
        'blog_post_description.blog_post_description_blog_post_id',
        '=',
        'blog_post.blog_post_id'
      );

    const post = await query.load(pool);

    if (post === null) {
      response.status(404);
      next();
    } else {
      setContextValue(request, 'blogPostId', post.blog_post_id);
      setContextValue(request, 'blogPostUuid', post.uuid);
      setPageMetaInfo(request, {
        title: post.name,
        description: post.name
      });
      next();
    }
  } catch (e) {
    next(e);
  }
};
