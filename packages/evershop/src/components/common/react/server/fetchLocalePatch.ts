/**
 * Inline-script source (storefront only) injected into <head> before the bundles. It
 * wraps `window.fetch` to attach the page's locale as an `X-Locale` header on
 * **same-origin** requests, so the locale reaches the unprefixed REST `/api/*` endpoints
 * (cart/checkout/customer XHRs) that don't go through the urql GraphQL client (spec
 * §6.13). The urql clients set the header themselves; this covers everything else without
 * touching call sites.
 *
 * Why same-origin only: adding a custom header to a CROSS-origin request makes it a
 * non-simple request → triggers a CORS preflight, which would break third-party calls
 * (analytics, payment SDKs) whose servers don't allow `X-Locale`. So we never touch them.
 *
 * Other safety properties:
 * - Reads the locale lazily from `window.eContext` (always the current page locale).
 * - Handles string | URL | Request inputs and Headers | object | array header forms.
 * - Never overrides an `X-Locale` a caller already set (e.g. urql).
 * - Never throws — any failure falls through to the native fetch.
 * - Idempotent (guards against double-patching).
 *
 * Static string (no interpolation) → no XSS surface.
 */
export const FETCH_LOCALE_PATCH = `(function () {
  if (typeof window === 'undefined' || !window.fetch || window.__localeFetchPatched) return;
  window.__localeFetchPatched = true;
  var nativeFetch = window.fetch.bind(window);
  function sameOrigin(u) {
    try { return new URL(u, window.location.href).origin === window.location.origin; }
    catch (e) { return false; }
  }
  window.fetch = function (input, init) {
    try {
      var locale = window.eContext && window.eContext.locale;
      if (locale) {
        var url = typeof input === 'string' ? input : (input && input.url) || '';
        if (sameOrigin(url)) {
          if (typeof Request !== 'undefined' && input instanceof Request) {
            if (!input.headers.has('X-Locale')) {
              var rh = new Headers(input.headers);
              rh.set('X-Locale', locale);
              input = new Request(input, { headers: rh });
            }
          } else {
            init = Object.assign({}, init);
            var h = new Headers(init.headers || {});
            if (!h.has('X-Locale')) { h.set('X-Locale', locale); init.headers = h; }
          }
        }
      }
    } catch (e) { /* never break fetch */ }
    return nativeFetch(input, init);
  };
})();`;
