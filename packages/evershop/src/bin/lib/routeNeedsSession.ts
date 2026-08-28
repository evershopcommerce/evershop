/**
 * Route ids that must NOT get a session. Asset-serving endpoints answer
 * anonymous, cache-forever responses; a session here means a Set-Cookie on
 * every image response — which makes CDNs (Cloudflare et al.) refuse to
 * cache them — plus a session-store INSERT per image request. Found live
 * on EverShop Cloud (2026-08-28): every product image was cf-cache-status
 * BYPASS purely because of the sid cookie.
 */
const SESSION_EXEMPT_ROUTE_IDS = new Set([
  'images',
  'staticAsset',
  'adminStaticAsset'
]);

export function routeNeedsSession(routeId: string | undefined): boolean {
  return routeId === undefined || !SESSION_EXEMPT_ROUTE_IDS.has(routeId);
}
