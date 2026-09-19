import { routeNeedsSession } from '../../routeNeedsSession.js';

describe('routeNeedsSession', () => {
  // The asset-serving exemptions: a session on the /images optimizer meant
  // a Set-Cookie on every image response (CDNs then refuse to cache) and a
  // session-store INSERT per image request. Found live, 2026-08-28.
  it('exempts the image optimizer and static-asset routes', () => {
    expect(routeNeedsSession('images')).toBe(false);
    expect(routeNeedsSession('staticAsset')).toBe(false);
    expect(routeNeedsSession('adminStaticAsset')).toBe(false);
  });

  it('every page route keeps its session', () => {
    expect(routeNeedsSession('homepage')).toBe(true);
    expect(routeNeedsSession('productView')).toBe(true);
    expect(routeNeedsSession('checkout')).toBe(true);
  });

  it('an unmatched route (no currentRoute) keeps the session middleware', () => {
    expect(routeNeedsSession(undefined)).toBe(true);
  });
});
