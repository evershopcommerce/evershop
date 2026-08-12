import { select } from '@evershop/postgres-query-builder';
import { localizeUrl } from '../../../../../lib/locale/localeContext.js';
import { pool } from '../../../../../lib/postgres/connection.js';
import { getBaseUrl } from '../../../../../lib/util/getBaseUrl.js';
import { setPageMetaInfo } from '../../../../cms/services/pageMetaInfo.js';
import { setContextValue } from '../../../../graphql/services/contextHelper.js';
import { BlogUrn } from '../../../lib/BlogUrn.js';
import { resolveReactor } from '../../../services/reaction/resolveReactor.js';

export default async (request, response, next) => {
  try {
    const query = select().from('blog_post');
    query
      .leftJoin('blog_post_description')
      .on(
        'blog_post.blog_post_id',
        '=',
        'blog_post_description.blog_post_description_blog_post_id'
      );
    query
      .where('blog_post.uuid', '=', request.params.uuid)
      .and('blog_post.status', '=', 1);
    const post = await query.load(pool);

    if (post === null) {
      response.status(404);
      next();
      return;
    }

    setContextValue(request, 'currentBlogPostId', post.blog_post_id);
    request.locals = request.locals ?? {};
    request.locals.pageBuilderEntityUrn = BlogUrn.post(post.uuid);

    // Visitor fingerprint (read-only here — no cookie issued on GET) so the
    // reactions/comments resolvers can mark the visitor's own reaction/likes.
    const fingerprint = resolveReactor(request);
    setContextValue(request, 'blogVisitor', fingerprint);
    if (fingerprint) {
      const reacted = await pool.query(
        `SELECT reaction_type FROM blog_reaction
          WHERE entity_type='post' AND entity_id=$1 AND fingerprint=$2`,
        [post.blog_post_id, fingerprint]
      );
      if (reacted.rows[0]) {
        setContextValue(
          request,
          'blogPostReactedType',
          reacted.rows[0].reaction_type
        );
      }
    }

    // Author name → article:author.
    let authorName: string | undefined;
    if (post.author_id) {
      const author = await select()
        .from('admin_user')
        .where('admin_user_id', '=', post.author_id)
        .load(pool);
      authorName = author?.full_name || undefined;
    }

    // Category → breadcrumb crumb.
    let category;
    if (post.category_id) {
      const categoryQuery = select().from('blog_category');
      categoryQuery
        .leftJoin('blog_category_description')
        .on(
          'blog_category_description.blog_category_description_blog_category_id',
          '=',
          'blog_category.blog_category_id'
        );
      category = await categoryQuery
        .where('blog_category.blog_category_id', '=', post.category_id)
        .load(pool);
    }

    // Tag names → article:tag.
    const tagQuery = select().from('blog_tag');
    tagQuery
      .leftJoin('blog_post_tag')
      .on('blog_post_tag.tag_id', '=', 'blog_tag.blog_tag_id');
    const tagRows = await tagQuery
      .where('blog_post_tag.post_id', '=', post.blog_post_id)
      .execute(pool);
    const tagNames = tagRows.map((t) => t.name);

    const baseUrl = getBaseUrl();
    const ogImage = post.thumbnail
      ? post.thumbnail.startsWith('http')
        ? post.thumbnail
        : `${baseUrl}${post.thumbnail}`
      : undefined;

    setPageMetaInfo(request, {
      title: post.meta_title || post.name,
      description:
        post.meta_description || post.short_description || post.name,
      ogInfo: {
        type: 'article',
        ...(ogImage ? { image: ogImage } : {}),
        ...(post.published_at
          ? { publishedTime: new Date(post.published_at).toISOString() }
          : {}),
        ...(authorName ? { authors: [authorName] } : {}),
        ...(tagNames.length ? { tags: tagNames } : {})
      },
      breadcrumbs: [
        { title: 'Home', url: localizeUrl('/') },
        { title: 'Blog', url: localizeUrl('/blog') },
        ...(category
          ? [
              {
                title: category.name,
                url: localizeUrl(`/blog/category/${category.url_key}`)
              }
            ]
          : []),
        { title: post.name, url: localizeUrl(`/blog/${post.url_key}`) }
      ]
    });
    next();
  } catch (e) {
    next(e);
  }
};
