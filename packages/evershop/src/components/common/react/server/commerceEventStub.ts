/**
 * Inline-script source (storefront only) for the top of <head>: a stand-in
 * for `window.evershop.onCommerceEvent` until the commerce event bus
 * (`components/common/commerceEvents.ts`) loads with the page bundle. It
 * queues each call in `window.evershop.commerceEventQueue`, and the bus
 * subscribes them when it loads, so a script in the head (Google Tag Manager,
 * a pixel) can subscribe at once and still gets the page-load events live.
 *
 * The function it returns stops the listener, before or after the bus took
 * the call over. It does nothing when the bus is already there.
 *
 * Static string (no interpolation) → no XSS surface.
 */
export const COMMERCE_EVENT_STUB = `(function () {
  var e = window.evershop = window.evershop || {};
  if (e.onCommerceEvent) return;
  var q = e.commerceEventQueue = e.commerceEventQueue || [];
  e.onCommerceEvent = function (name, handler, options) {
    var call = { args: [name, handler, options] };
    q.push(call);
    return function () {
      call.stopped = true;
      if (call.stop) call.stop();
    };
  };
})();`;
