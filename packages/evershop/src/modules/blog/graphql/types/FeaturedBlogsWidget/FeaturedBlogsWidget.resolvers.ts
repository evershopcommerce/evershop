import { pool } from '../../../../../lib/postgres/connection.js';
import { camelCase } from '../../../../../lib/util/camelCase.js';
import { getPostsBaseQuery } from '../../../services/getPostsBaseQuery.js';

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
    /** Resolve the chosen uuids to published posts, preserving pick order. */
    posts: async ({ _postUuids, _count }: any) => {
      const uuids = (_postUuids || []).filter(
        (u: unknown) => typeof u === 'string'
      );
      if (uuids.length === 0) {
        return [];
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
