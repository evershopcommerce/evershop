import { select } from '@evershop/postgres-query-builder';
import { localizeUrl } from '../../../../../lib/locale/localeContext.js';
import { pool } from '../../../../../lib/postgres/connection.js';
import { EvershopRequest } from '../../../../../types/request.js';
import { EvershopResponse } from '../../../../../types/response.js';

/**
 * Storefront-wide 302 for old entity URLs after a `url_key` change, plus a
 * bare-slug fallback so `/<url_key>` resolves even for entities that never
 * lived at the root path.
 *
 * Runs on every front-store route via `pages/frontStore/all`, but no-ops unless
 * the request is a would-be-404 (`currentRoute.id === 'notFound'`) — `all`/
 * `global` middlewares are NOT skipped on a 404 (buildMiddlewareFunction.js), so
 * this fires before the 404 body renders. Active (3-arg) middleware: it either
 * calls `next()` to proceed or sends a redirect and returns without `next()`.
 *
 * Lookup order:
 *  1. `url_redirect` — a URL this shop actually served in the past (recorded
 *     by the capture services on url_key/category changes).
 *  2. Bare-slug fallback — a single-segment `/<key>` that matches the tail of
 *     a live `url_rewrite` path 302s to that canonical path. Without this,
 *     `/<url_key>` only works for entities that once lived at root (an
 *     uncategorised product later assigned to a category earns a redirect;
 *     a product BORN categorised — e.g. via the duplicate flow, which
 *     prefills the source's category — never does). The fallback makes
 *     bare-slug reachability uniform instead of history-dependent, and always
 *     targets the CURRENT canonical path. Single-segment only: deeper stale
 *     paths are covered by real captured redirects, and matching arbitrary
 *     `/<junk>/<key>` prefixes would mint an unbounded alias space.
 *
 * See wiki/url-redirects.md.
 */
export default async (
  request: EvershopRequest,
  response: EvershopResponse,
  next: (err?: unknown) => void
): Promise<void> => {
  // Only would-be-404s; never touch a request that matched a route.
  if ((request as any).currentRoute?.id !== 'notFound') {
    next();
    return;
  }
  // Never 3xx a mutating request.
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    next();
    return;
  }

  const path =
    (request as any).localePath ?? request.originalUrl.split('?')[0];
  const query = request.originalUrl.includes('?')
    ? `?${request.originalUrl.split('?')[1]}`
    : '';

  // 1. Recorded redirect. Query-free self-guard: compare the stored to_path
  // against the (query-free) incoming path so a residual from==to row can't
  // loop — a degenerate self-row falls through to the slug fallback instead.
  const redirect = await select()
    .from('url_redirect')
    .where('from_path', '=', path)
    .load(pool);
  if (redirect && redirect.to_path !== path) {
    response.redirect(302, localizeUrl(redirect.to_path) + query);
    return;
  }

  // 2. Bare-slug fallback: `/<key>` → the canonical `…/<key>` rewrite path.
  if (!/^\/[^/]+$/.test(path)) {
    next();
    return;
  }
  // Escape LIKE wildcards so a url_key containing `_`/`%` matches literally.
  const slug = path.slice(1).replace(/([\\%_])/g, '\\$1');
  const rewriteQuery = select('request_path').from('url_rewrite');
  rewriteQuery.where('request_path', 'LIKE', `%/${slug}`);
  // Slugs are not globally unique across entities — pick deterministically
  // (oldest rewrite row wins) instead of leaving it to scan order.
  rewriteQuery.orderBy('url_rewrite_id', 'ASC');
  const rewrite = await rewriteQuery.load(pool);
  // Self-guard: `%` matches empty, so `/<key>` can match its own row (only
  // reachable when the rewrite fallback is disabled, e.g. NODE_ENV=test).
  if (!rewrite || rewrite.request_path === path) {
    next();
    return;
  }
  response.redirect(302, localizeUrl(rewrite.request_path) + query);
};
