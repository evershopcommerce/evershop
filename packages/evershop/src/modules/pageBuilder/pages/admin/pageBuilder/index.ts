import { buildUrl } from '../../../../../lib/router/buildUrl.js';
import { getRoutes } from '../../../../../lib/router/Router.js';
import { EvershopRequest } from '../../../../../types/request.js';
import { EvershopResponse } from '../../../../../types/response.js';
import { setPageMetaInfo } from '../../../../cms/services/pageMetaInfo.js';

/**
 * `/admin/page-builder` redirects straight into the editor for the first
 * route that opts into page-builder editing (`"editable": true` in its
 * `route.json`). Falls through to the empty-state picker if no routes
 * are editable. This matches the design — the menu item lands the user
 * on the canvas, not a list.
 */
// 3-arg signature so `buildMiddlewareFunction` respects manual `next()`
// handling. With a 2-arg handler the framework auto-calls `next()` after the
// function resolves, which after `response.redirect()` runs the rest of the
// chain on an already-sent response and trips ERR_HTTP_HEADERS_SENT.
export default (
  request: EvershopRequest,
  response: EvershopResponse,
  next: (err?: unknown) => void
) => {
  const routes = getRoutes() as Array<{
    id: string;
    isApi?: boolean;
    isAdmin?: boolean;
    editable?: boolean;
    path?: string;
  }>;
  const editableRoutes = routes.filter(
    (r) =>
      !r.isApi &&
      !r.isAdmin &&
      r.editable === true &&
      typeof r.path === 'string'
  );
  // Prefer homepage when available — that's the merchandiser's default
  // entry point; the design's session picker also defaults there.
  const firstEditable =
    editableRoutes.find((r) => r.id === 'homepage') ?? editableRoutes[0];
  if (firstEditable) {
    response.redirect(
      302,
      buildUrl('pageBuilderEdit', { routeId: firstEditable.id })
    );
    // Response already sent — do not call next(), otherwise downstream
    // middleware (notFound, buildQuery, render) will try to send a body.
    return;
  }
  setPageMetaInfo(request, {
    title: 'Page builder',
    description: 'No editable routes found.'
  });
  // Fall through to the empty-state RoutePicker component (rendered by
  // the page's React tree).
  next();
};
