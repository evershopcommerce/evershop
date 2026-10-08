import { pool } from '../../../../../lib/postgres/connection.js';
import { camelCase } from '../../../../../lib/util/camelCase.js';
import { getPostsBaseQuery } from '../../../services/getPostsBaseQuery.js';

/**
 * How many posts a teaser shows when nobody has said: the `count` the widget registers with
 * (`bootstrap.ts` defaultSettings), so a widget with no picks and no count behaves like a fresh one.
 */
const DEFAULT_LATEST_COUNT = 3;

export default {
  Query: {
    featuredBlogsWidget: (_root: any, args: any) => ({
      eyebrow: args.eyebrow ?? null,
      heading: args.heading ?? null,
      subText: args.subText ?? null,
      count: args.count ?? null,
      columns: args.columns ?? null,
      _postUuids: Array.isArray(args.postUuids) ? args.postUuids : [],
      _count: args.count ?? null
    })
  },
  FeaturedBlogsWidget: {
    /**
     * Resolve the chosen uuids to published posts, preserving pick order. With NO picks, the newest
     * published posts, up to `count`: a Journal teaser is "the latest", and a theme cannot name a
     * store's posts (their uuids are the store's, and `store-ref:` resolves only products and
     * collections), so a freshly activated storefront had no way to show its journal at all
     * (theme-lab FINDINGS #52). Picks that exist but are all unpublished still show nothing: that
     * is a choice, not an absence of one.
     */
    posts: async ({ _postUuids, _count }: any) => {
      const uuids = (_postUuids || []).filter(
        (u: unknown) => typeof u === 'string'
      );
      if (uuids.length === 0) {
        const limit =
          typeof _count === 'number' && _count > 0
            ? _count
            : DEFAULT_LATEST_COUNT;
        const latest = getPostsBaseQuery();
        latest.where('blog_post.status', '=', 1);
        // ONE order-by: the builder keeps a single field, and a second `orderBy` call silently
        // replaces the first. Newest first, as the related-posts resolver and the RSS feed do.
        latest.orderBy('blog_post.published_at', 'DESC');
        latest.limit(0, limit);
        const newest = await latest.execute(pool);
        return newest.map((r: any) => camelCase(r));
      }
      const query = getPostsBaseQuery();
      query
        .where('blog_post.uuid', 'IN', uuids)
        .and('blog_post.status', '=', 1);
      const rows = await query.execute(pool);
      const byUuid = new Map(
        rows.map((r: any) => [r.uuid, camelCase(r)])
      );
      const ordered = uuids
        .map((u: string) => byUuid.get(u))
        .filter(Boolean);
      return typeof _count === 'number' && _count > 0
        ? ordered.slice(0, _count)
        : ordered;
    }
  }
};
