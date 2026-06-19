/**
 * Page-builder mode detection.
 *
 * The storefront runs the same React tree in production and inside the
 * page-builder admin iframe. To distinguish, the iframe must be:
 *   - Running inside a parent window (`window.parent !== window`), AND
 *   - Carrying `?changeset=<token>` in its URL.
 *
 * Both conditions must hold so legitimate non-page-builder iframes (third-
 * party embeds, dev tools, etc.) don't accidentally activate edit affordances.
 *
 * The detection is deferred until after hydration via `useEffect` in callers
 * to keep the first render SSR-stable.
 */
export function isInPageBuilderIframe(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.parent === window) return false;
  try {
    const params = new URLSearchParams(window.location.search);
    return params.has('changeset');
  } catch {
    return false;
  }
}

/**
 * Window-level flag set by the iframe's first effect (after hydration is
 * stable). Components like `<Editable>` read this to switch into
 * page-builder behavior.
 *
 * Intentionally a global flag rather than React context so non-React code
 * (the bridge listener, contentEditable handlers) can check it cheaply.
 */
declare global {
  interface Window {
    __EVERSHOP_PAGE_BUILDER__?: { active: true };
  }
}

export function markPageBuilderActive(): void {
  if (typeof window === 'undefined') return;
  window.__EVERSHOP_PAGE_BUILDER__ = { active: true };
}

export function isPageBuilderActive(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.__EVERSHOP_PAGE_BUILDER__?.active === true
  );
}

/**
 * Send a message from the iframe to its parent window. No-op if not in an
 * iframe. Always uses `window.location.origin` as the target — same-origin
 * is required by spec § 7.3.
 */
export function postToParent(message: unknown): void {
  if (typeof window === 'undefined' || window.parent === window) return;
  window.parent.postMessage(message, window.location.origin);
}

/**
 * SSR-safe React hook returning `true` once the component has mounted in
 * the page-builder iframe. First render always returns `false` so the SSR
 * output matches the production storefront byte-for-byte; the post-mount
 * effect flips it to `true` when applicable.
 *
 * Pulled into its own hook so Area, WidgetChrome, and AreaStartDropZone all
 * share the same detection logic without re-implementing the
 * useState/useEffect pattern in each place.
 */
import { useEffect, useState } from 'react';

export function useIsInPageBuilderIframe(): boolean {
  const [active, setActive] = useState(false);
  useEffect(() => {
    if (isInPageBuilderIframe()) setActive(true);
  }, []);
  return active;
}
