import { select } from '@evershop/postgres-query-builder';
import { pool } from '../../../../../lib/postgres/connection.js';
import { getBaseUrl } from '../../../../../lib/util/getBaseUrl.js';

function escapeXml(value: unknown): string {
  return String(value ?? '').replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '&':
        return '&amp;';
      case "'":
        return '&apos;';
      default:
        return '&quot;';
    }
  });
}

/**
 * RSS 2.0 feed of the most recent published posts. Sends XML and does NOT call
 * next(), short-circuiting the React render pipeline.
 */
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
    query.where('blog_post.status', '=', 1);
    query.orderBy('blog_post.published_at', 'DESC');
    query.limit(0, 20);
    const posts = await query.execute(pool);

    const baseUrl = getBaseUrl();
    const items = posts
      .map((post) => {
        const link = `${baseUrl}/blog/${post.url_key}`;
        const date = post.published_at
          ? new Date(post.published_at).toUTCString()
          : '';
        return `    <item>
      <title>${escapeXml(post.name)}</title>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="true">${escapeXml(link)}</guid>
      ${date ? `<pubDate>${date}</pubDate>` : ''}
      <description>${escapeXml(post.short_description || '')}</description>
    </item>`;
      })
      .join('\n');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Blog</title>
    <link>${baseUrl}/blog</link>
    <description>Latest blog posts</description>
${items}
  </channel>
</rss>`;

    response.set('Content-Type', 'application/rss+xml; charset=utf-8');
    response.set('Cache-Control', 'public, max-age=3600');
    response.send(xml);
  } catch (e) {
    next(e);
  }
};
