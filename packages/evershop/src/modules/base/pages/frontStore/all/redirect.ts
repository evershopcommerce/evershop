import { select } from '@evershop/postgres-query-builder';
import { localizeUrl } from '../../../../../lib/locale/localeContext.js';
import { pool } from '../../../../../lib/postgres/connection.js';
import { EvershopRequest } from '../../../../../types/request.js';
import { EvershopResponse } from '../../../../../types/response.js';

/**
 * Storefront-wide 302 for old entity URLs after a `url_key` change.
 *
 * Runs on every front-store route via `pages/frontStore/all`, but no-ops unless
 * the request is a would-be-404 (`currentRoute.id === 'notFound'`) — `all`/
 * `global` middlewares are NOT skipped on a 404 (buildMiddlewareFunction.js), so
 * this fires before the 404 body renders. Active (3-arg) middleware: it either
 * calls `next()` to proceed or sends a redirect and returns without `next()`.
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
  const row = await select()
    .from('url_redirect')
    .where('from_path', '=', path)
    .load(pool);

  if (!row) {
    next();
    return;
  }
  // Query-free self-guard: compare the stored to_path against the (query-free)
  // incoming path so a residual from==to row can't loop.
  if (row.to_path === path) {
    next();
    return;
  }

  const query = request.originalUrl.includes('?')
    ? `?${request.originalUrl.split('?')[1]}`
    : '';
  response.redirect(302, localizeUrl(row.to_path) + query);
};
